import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export async function listDepartments() {
  return query<RowDataPacket[]>(
    `SELECT
       d.department_id,
       d.department_name,
       d.description,
       d.created_at,
       COUNT(e.employee_id) AS employee_count,
       SUM(CASE WHEN e.employment_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_employee_count
     FROM DEPARTMENT d
     LEFT JOIN EMPLOYEE e ON d.department_id = e.department_id
     GROUP BY d.department_id, d.department_name, d.description, d.created_at
     ORDER BY d.department_name ASC`
  );
}

export async function createDepartment(data: { department_name: string; description: string | null }) {
  const [result] = await (await import('../config/db.ts')).getPool().execute<ResultSetHeader>(
    'INSERT INTO DEPARTMENT (department_name, description) VALUES (?, ?)',
    [data.department_name, data.description]
  );
  const rows = await query<RowDataPacket[]>('SELECT * FROM DEPARTMENT WHERE department_id = ?', [
    result.insertId,
  ]);
  return rows[0];
}

export async function updateDepartment(
  id: number,
  data: { department_name: string; description: string | null }
) {
  const [result] = await (await import('../config/db.ts')).getPool().execute<ResultSetHeader>(
    'UPDATE DEPARTMENT SET department_name = ?, description = ? WHERE department_id = ?',
    [data.department_name, data.description, id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Department not found.', 404);
  }
  const rows = await query<RowDataPacket[]>('SELECT * FROM DEPARTMENT WHERE department_id = ?', [id]);
  return rows[0];
}

export async function deleteDepartment(id: number) {
  const [result] = await (await import('../config/db.ts')).getPool().execute<ResultSetHeader>(
    'DELETE FROM DEPARTMENT WHERE department_id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Department not found.', 404);
  }
}
