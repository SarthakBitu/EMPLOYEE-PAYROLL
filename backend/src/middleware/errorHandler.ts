import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/appError.ts';

interface MySqlError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

export function errorHandler(
  err: Error | AppError | MySqlError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const mysqlErr = err as MySqlError;

  // Duplicate key constraint
  if (mysqlErr.code === 'ER_DUP_ENTRY' || mysqlErr.errno === 1062) {
    res.status(409).json({
      success: false,
      message: 'A record with this unique identifier already exists.',
    });
    return;
  }

  // Foreign key reference error on insert/update
  if (mysqlErr.code === 'ER_NO_REFERENCED_ROW_2' || mysqlErr.errno === 1452) {
    res.status(400).json({
      success: false,
      message: 'Referenced department, designation, employee, or component does not exist.',
    });
    return;
  }

  // Foreign key restrict error on delete
  if (mysqlErr.code === 'ER_ROW_IS_REFERENCED_2' || mysqlErr.errno === 1451) {
    res.status(409).json({
      success: false,
      message: 'Cannot delete this record because other records depend on it.',
    });
    return;
  }

  // SQLSTATE '45000' raised by triggers or stored procedures
  if (mysqlErr.sqlState === '45000' || mysqlErr.errno === 1644) {
    const msg = mysqlErr.sqlMessage || mysqlErr.message || 'Database validation rule failed.';
    const status = /duplicate|already been generated/i.test(msg) ? 409 : 400;
    res.status(status).json({
      success: false,
      message: msg,
    });
    return;
  }

  // Check constraint violation
  if (mysqlErr.errno === 4025 || mysqlErr.code === 'ER_CONSTRAINT_FAILED') {
    res.status(400).json({
      success: false,
      message: 'Database constraint violation: please verify numeric values and ranges.',
    });
    return;
  }

  console.error('[Server Error]', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred. Please try again.',
  });
}
