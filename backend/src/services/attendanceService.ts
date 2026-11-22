import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export interface AttendanceFilters {
  date?: string;
  month?: number;
  year?: number;
  employee_id?: number;
  department_id?: number;
  status?: string;
}

export async function listAttendance(filters: AttendanceFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.date) {
    conditions.push('a.attendance_date = ?');
    params.push(filters.date);
  }
  if (filters.month) {
    conditions.push('MONTH(a.attendance_date) = ?');
    params.push(filters.month);
  }
  if (filters.year) {
    conditions.push('YEAR(a.attendance_date) = ?');
    params.push(filters.year);
  }
  if (filters.employee_id) {
    conditions.push('a.employee_id = ?');
    params.push(filters.employee_id);
  }
  if (filters.department_id) {
    conditions.push('e.department_id = ?');
    params.push(filters.department_id);
  }
  if (filters.status && ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'].includes(filters.status)) {
    conditions.push('a.status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<RowDataPacket[]>(
    `SELECT
       a.*,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name
     FROM ATTENDANCE a
     INNER JOIN EMPLOYEE e ON a.employee_id = e.employee_id
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     ${whereClause}
     ORDER BY a.attendance_date DESC, e.employee_code ASC
     LIMIT 500`,
    params
  );
}

export async function getAttendanceStats(month: number, year: number, departmentId?: number) {
  const params: unknown[] = [month, year];
  let deptFilter = '';
  if (departmentId) {
    deptFilter = 'AND e.department_id = ?';
    params.push(departmentId);
  }

  const rows = await query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total_records,
       SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
       SUM(CASE WHEN a.status = 'HALF_DAY' THEN 1 ELSE 0 END) AS half_day_count,
       SUM(CASE WHEN a.status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_count,
       SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
       SUM(CASE WHEN a.status = 'HOLIDAY' THEN 1 ELSE 0 END) AS holiday_count,
       ROUND(COALESCE(SUM(a.working_hours), 0), 2) AS total_working_hours,
       ROUND(COALESCE(SUM(a.overtime_hours), 0), 2) AS total_overtime_hours
     FROM ATTENDANCE a
     INNER JOIN EMPLOYEE e ON a.employee_id = e.employee_id
     WHERE MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?
     ${deptFilter}`,
    params
  );

  return rows[0];
}

export interface AttendancePayload {
  employee_id: number;
  attendance_date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY' | 'HOLIDAY';
  working_hours: number;
  overtime_hours: number;
  remarks: string | null;
}

export async function createAttendance(data: AttendancePayload) {
  const [result] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO ATTENDANCE (
       employee_id, attendance_date, status, working_hours, overtime_hours, remarks
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.employee_id,
      data.attendance_date,
      data.status,
      data.working_hours,
      data.overtime_hours,
      data.remarks,
    ]
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT
       a.*,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name
     FROM ATTENDANCE a
     INNER JOIN EMPLOYEE e ON a.employee_id = e.employee_id
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     WHERE a.attendance_id = ?`,
    [result.insertId]
  );
  return rows[0];
}

export async function updateAttendance(id: number, data: Omit<AttendancePayload, 'employee_id' | 'attendance_date'>) {
  const [result] = await getPool().execute<ResultSetHeader>(
    `UPDATE ATTENDANCE
     SET status = ?, working_hours = ?, overtime_hours = ?, remarks = ?
     WHERE attendance_id = ?`,
    [data.status, data.working_hours, data.overtime_hours, data.remarks, id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Attendance record not found.', 404);
  }
  const rows = await query<RowDataPacket[]>(
    `SELECT
       a.*,
       e.employee_code,
       TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee_name,
       d.department_name
     FROM ATTENDANCE a
     INNER JOIN EMPLOYEE e ON a.employee_id = e.employee_id
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     WHERE a.attendance_id = ?`,
    [id]
  );
  return rows[0];
}

export async function deleteAttendance(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM ATTENDANCE WHERE attendance_id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Attendance record not found.', 404);
  }
}
