import type { Request, Response } from 'express';
import {
  optionalString,
  requireNonEmptyString,
  validateNonNegativeNumber,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as deductionService from '../services/deductionService.ts';
import { AppError } from '../utils/appError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

function parseDeduction(body: Record<string, unknown>) {
  const deduction_name = requireNonEmptyString(body.deduction_name, 'Deduction name');
  const deduction_type = String(body.deduction_type || 'FIXED').toUpperCase();
  if (!['FIXED', 'PERCENTAGE'].includes(deduction_type)) {
    throw new AppError('Deduction type must be FIXED or PERCENTAGE.', 400);
  }
  const default_amount = validateNonNegativeNumber(body.default_amount ?? 0, 'Default amount');
  if (deduction_type === 'PERCENTAGE' && default_amount > 100) {
    throw new AppError('Percentage deduction cannot exceed 100%.', 400);
  }
  const description = optionalString(body.description);
  return {
    deduction_name,
    deduction_type: deduction_type as 'FIXED' | 'PERCENTAGE',
    default_amount,
    description,
  };
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await deductionService.listDeductions();
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseDeduction(req.body);
  const created = await deductionService.createDeduction(payload);
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Deduction ID');
  const payload = parseDeduction(req.body);
  const updated = await deductionService.updateDeduction(id, payload);
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Deduction ID');
  await deductionService.deleteDeduction(id);
  res.json({ success: true, message: 'Deduction deleted successfully.' });
});
