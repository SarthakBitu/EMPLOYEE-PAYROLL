import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export async function listAllowances() {
  return query<RowDataPacket[]>('SELECT * FROM ALLOWANCE ORDER BY allowance_name ASC');
}

export async function createAllowance(data: {
  allowance_name: string;
  allowance_type: 'FIXED' | 'PERCENTAGE';
  default_amount: number;
  description: string | null;
}) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO ALLOWANCE (allowance_name, allowance_type, default_amount, description) VALUES (?, ?, ?, ?)',
    [data.allowance_name, data.allowance_type, data.default_amount, data.description]
  );
  const rows = await query<RowDataPacket[]>('SELECT * FROM ALLOWANCE WHERE allowance_id = ?', [
    result.insertId,
  ]);
  return rows[0];
}

export async function updateAllowance(
  id: number,
  data: {
    allowance_name: string;
    allowance_type: 'FIXED' | 'PERCENTAGE';
    default_amount: number;
    description: string | null;
  }
) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE ALLOWANCE SET allowance_name = ?, allowance_type = ?, default_amount = ?, description = ? WHERE allowance_id = ?',
    [data.allowance_name, data.allowance_type, data.default_amount, data.description, id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Allowance not found.', 404);
  }
  const rows = await query<RowDataPacket[]>('SELECT * FROM ALLOWANCE WHERE allowance_id = ?', [id]);
  return rows[0];
}

export async function deleteAllowance(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM ALLOWANCE WHERE allowance_id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Allowance not found.', 404);
  }
}
