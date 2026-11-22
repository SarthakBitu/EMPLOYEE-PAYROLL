import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export async function listDesignations() {
  return query<RowDataPacket[]>(
    `SELECT
       des.designation_id,
       des.designation_name,
       des.description,
       des.created_at,
       COUNT(e.employee_id) AS employee_count
     FROM DESIGNATION des
     LEFT JOIN EMPLOYEE e ON des.designation_id = e.designation_id
     GROUP BY des.designation_id, des.designation_name, des.description, des.created_at
     ORDER BY des.designation_name ASC`
  );
}

export async function createDesignation(data: { designation_name: string; description: string | null }) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO DESIGNATION (designation_name, description) VALUES (?, ?)',
    [data.designation_name, data.description]
  );
  const rows = await query<RowDataPacket[]>('SELECT * FROM DESIGNATION WHERE designation_id = ?', [
    result.insertId,
  ]);
  return rows[0];
}

export async function updateDesignation(
  id: number,
  data: { designation_name: string; description: string | null }
) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE DESIGNATION SET designation_name = ?, description = ? WHERE designation_id = ?',
    [data.designation_name, data.description, id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Designation not found.', 404);
  }
  const rows = await query<RowDataPacket[]>('SELECT * FROM DESIGNATION WHERE designation_id = ?', [id]);
  return rows[0];
}

export async function deleteDesignation(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM DESIGNATION WHERE designation_id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Designation not found.', 404);
  }
}
