import type { Request, Response } from 'express';
import {
  validateDate,
  validateNonNegativeNumber,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as salaryService from '../services/salaryService.ts';
import { AppError } from '../utils/appError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

function parseComponents(raw: unknown, label: string): salaryService.SalaryComponentInput[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const result: salaryService.SalaryComponentInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const id = validatePositiveInt(obj.id ?? obj.allowance_id ?? obj.deduction_id, `${label} ID`);
    if (seen.has(id)) {
      throw new AppError(`Duplicate ${label.toLowerCase()} component selected.`, 400);
    }
    seen.add(id);
    const amount = validateNonNegativeNumber(obj.amount, `${label} amount`);
    result.push({ id, amount });
  }
  return result;
}

function parseSalaryPayload(body: Record<string, unknown>): salaryService.SalaryStructurePayload {
  const employee_id = validatePositiveInt(body.employee_id, 'Employee');
  const basic_salary = validateNonNegativeNumber(body.basic_salary, 'Basic salary', true);
  const effective_from = validateDate(body.effective_from, 'Effective from date', true)!;
  const effective_to = validateDate(body.effective_to, 'Effective to date', false);
  if (effective_to && effective_to < effective_from) {
    throw new AppError('Effective to date cannot be earlier than effective from date.', 400);
  }
  const status = String(body.status || 'ACTIVE').toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    throw new AppError('Status must be ACTIVE or INACTIVE.', 400);
  }
  const allowances = parseComponents(body.allowances, 'Allowance');
  const deductions = parseComponents(body.deductions, 'Deduction');

  return {
    employee_id,
    basic_salary,
    effective_from,
    effective_to,
    status: status as 'ACTIVE' | 'INACTIVE',
    allowances,
    deductions,
  };
}

export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await salaryService.listAllSalaryStructures();
  res.json({ success: true, data: rows });
});

export const getByEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = validatePositiveInt(req.params.employeeId, 'Employee ID');
  const rows = await salaryService.getSalaryByEmployeeId(employeeId);
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseSalaryPayload(req.body);
  const created = await salaryService.createSalaryStructure(payload);
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Salary structure ID');
  const payload = parseSalaryPayload(req.body);
  const updated = await salaryService.updateSalaryStructure(id, payload);
  res.json({ success: true, data: updated });
});
