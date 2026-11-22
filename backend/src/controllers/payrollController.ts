import type { Request, Response } from 'express';
import { validateMonthYear, validatePositiveInt } from '../middleware/validate.ts';
import * as payrollService from '../services/payrollService.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters: payrollService.PayrollFilters = {
    month: req.query.month ? Number(req.query.month) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
    status: typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
  };
  const rows = await payrollService.listPayroll(filters);
  res.json({ success: true, data: rows });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Payroll ID');
  const data = await payrollService.getPayrollById(id);
  res.json({ success: true, data });
});

export const getMonthly = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = validateMonthYear(req.params.month, req.params.year);
  const rows = await payrollService.getMonthlyPayroll(year, month);
  res.json({ success: true, data: rows });
});

export const preview = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = validateMonthYear(req.query.month, req.query.year);
  const data = await payrollService.previewMonthlyPayroll(month, year);
  res.json({ success: true, data });
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = validateMonthYear(req.body.month, req.body.year);
  const useStoredProcedure = Boolean(req.body.useStoredProcedure);
  const result = await payrollService.generateMonthlyPayroll(month, year, useStoredProcedure);
  res.status(201).json({ success: true, data: result });
});

export const markAsPaid = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Payroll ID');
  const updated = await payrollService.markPayrollAsPaid(id);
  res.json({ success: true, data: updated });
});
