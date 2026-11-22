import type { Request, Response } from 'express';
import {
  optionalString,
  requireNonEmptyString,
  validateNonNegativeNumber,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as allowanceService from '../services/allowanceService.ts';
import { AppError } from '../utils/appError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

function parseAllowance(body: Record<string, unknown>) {
  const allowance_name = requireNonEmptyString(body.allowance_name, 'Allowance name');
  const allowance_type = String(body.allowance_type || 'FIXED').toUpperCase();
  if (!['FIXED', 'PERCENTAGE'].includes(allowance_type)) {
    throw new AppError('Allowance type must be FIXED or PERCENTAGE.', 400);
  }
  const default_amount = validateNonNegativeNumber(body.default_amount ?? 0, 'Default amount');
  if (allowance_type === 'PERCENTAGE' && default_amount > 100) {
    throw new AppError('Percentage allowance cannot exceed 100%.', 400);
  }
  const description = optionalString(body.description);
  return {
    allowance_name,
    allowance_type: allowance_type as 'FIXED' | 'PERCENTAGE',
    default_amount,
    description,
  };
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await allowanceService.listAllowances();
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseAllowance(req.body);
  const created = await allowanceService.createAllowance(payload);
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Allowance ID');
  const payload = parseAllowance(req.body);
  const updated = await allowanceService.updateAllowance(id, payload);
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Allowance ID');
  await allowanceService.deleteAllowance(id);
  res.json({ success: true, message: 'Allowance deleted successfully.' });
});
