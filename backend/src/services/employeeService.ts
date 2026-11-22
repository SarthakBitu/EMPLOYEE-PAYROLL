import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export interface EmployeeFilters {
  search?: string;
  department_id?: number;
  designation_id?: number;
  status?: string;
}

export async function listEmployees(filters: EmployeeFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      '(e.employee_code LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR CONCAT(e.first_name, " ", COALESCE(e.last_name, "")) LIKE ?)'
    );
    params.push(term, term, term, term, term);
  }

  if (filters.department_id) {
    conditions.push('e.department_id = ?');
    params.push(filters.department_id);
  }

  if (filters.designation_id) {
    conditions.push('e.designation_id = ?');
    params.push(filters.designation_id);
  }

  if (filters.status && ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(filters.status)) {
    conditions.push('e.employment_status = ?');
    params.push(filters.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return query<RowDataPacket[]>(
    `SELECT
       e.*,
       d.department_name,
       des.designation_name,
       ss.basic_salary AS current_basic_salary
     FROM EMPLOYEE e
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
     LEFT JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
     ${whereClause}
     ORDER BY e.employee_id DESC`,
    params
  );
}

export async function getEmployeeById(id: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT
       e.*,
       d.department_name,
       des.designation_name,
       ss.salary_structure_id,
       ss.basic_salary AS current_basic_salary,
       ss.effective_from AS salary_effective_from
     FROM EMPLOYEE e
     INNER JOIN DEPARTMENT d ON e.department_id = d.department_id
     INNER JOIN DESIGNATION des ON e.designation_id = des.designation_id
     LEFT JOIN SALARY_STRUCTURE ss ON e.employee_id = ss.employee_id AND ss.status = 'ACTIVE'
     WHERE e.employee_id = ?`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError('Employee not found.', 404);
  }
  return rows[0];
}

export interface EmployeePayload {
  employee_code: string;
  first_name: string;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hire_date: string;
  department_id: number;
  designation_id: number;
  employment_status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export async function createEmployee(data: EmployeePayload) {
  const [result] = await getPool().execute<ResultSetHeader>(
    `INSERT INTO EMPLOYEE (
       employee_code, first_name, last_name, gender, date_of_birth,
       phone, email, address, hire_date, department_id, designation_id, employment_status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.employee_code,
      data.first_name,
      data.last_name,
      data.gender,
      data.date_of_birth,
      data.phone,
      data.email,
      data.address,
      data.hire_date,
      data.department_id,
      data.designation_id,
      data.employment_status,
    ]
  );
  return getEmployeeById(result.insertId);
}

export async function updateEmployee(id: number, data: EmployeePayload) {
  const [result] = await getPool().execute<ResultSetHeader>(
    `UPDATE EMPLOYEE SET
       employee_code = ?,
       first_name = ?,
       last_name = ?,
       gender = ?,
       date_of_birth = ?,
       phone = ?,
       email = ?,
       address = ?,
       hire_date = ?,
       department_id = ?,
       designation_id = ?,
       employment_status = ?
     WHERE employee_id = ?`,
    [
      data.employee_code,
      data.first_name,
      data.last_name,
      data.gender,
      data.date_of_birth,
      data.phone,
      data.email,
      data.address,
      data.hire_date,
      data.department_id,
      data.designation_id,
      data.employment_status,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Employee not found.', 404);
  }
  return getEmployeeById(id);
}

export async function deleteOrDeactivateEmployee(id: number) {
  const existing = await getEmployeeById(id);

  // Check if payroll history exists; if so, deactivate cleanly rather than violating FK RESTRICT
  const payrollRows = await query<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM PAYROLL WHERE employee_id = ?',
    [id]
  );
  if (Number(payrollRows[0]?.cnt || 0) > 0) {
    await getPool().execute(
      "UPDATE EMPLOYEE SET employment_status = 'INACTIVE' WHERE employee_id = ?",
      [id]
    );
    return {
      action: 'DEACTIVATED',
      message: `${existing.first_name} ${existing.last_name ?? ''} has payroll history and was deactivated to preserve financial records.`,
    };
  }

  await getPool().execute('DELETE FROM EMPLOYEE WHERE employee_id = ?', [id]);
  return {
    action: 'DELETED',
    message: `Employee ${existing.employee_code} deleted successfully.`,
  };
}
