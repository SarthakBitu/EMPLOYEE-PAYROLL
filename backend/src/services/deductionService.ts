import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool, query } from '../config/db.ts';
import { AppError } from '../utils/appError.ts';

export async function listDeductions() {
  return query<RowDataPacket[]>('SELECT * FROM DEDUCTION ORDER BY deduction_name ASC');
}

export async function createDeduction(data: {
  deduction_name: string;
  deduction_type: 'FIXED' | 'PERCENTAGE';
  default_amount: number;
  description: string | null;
}) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'INSERT INTO DEDUCTION (deduction_name, deduction_type, default_amount, description) VALUES (?, ?, ?, ?)',
    [data.deduction_name, data.deduction_type, data.default_amount, data.description]
  );
  const rows = await query<RowDataPacket[]>('SELECT * FROM DEDUCTION WHERE deduction_id = ?', [
    result.insertId,
  ]);
  return rows[0];
}

export async function updateDeduction(
  id: number,
  data: {
    deduction_name: string;
    deduction_type: 'FIXED' | 'PERCENTAGE';
    default_amount: number;
    description: string | null;
  }
) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'UPDATE DEDUCTION SET deduction_name = ?, deduction_type = ?, default_amount = ?, description = ? WHERE deduction_id = ?',
    [data.deduction_name, data.deduction_type, data.default_amount, data.description, id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Deduction not found.', 404);
  }
  const rows = await query<RowDataPacket[]>('SELECT * FROM DEDUCTION WHERE deduction_id = ?', [id]);
  return rows[0];
}

export async function deleteDeduction(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    'DELETE FROM DEDUCTION WHERE deduction_id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    throw new AppError('Deduction not found.', 404);
  }
}
