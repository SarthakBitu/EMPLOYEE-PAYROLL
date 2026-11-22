import type { Request, Response } from 'express';
import {
  optionalString,
  requireNonEmptyString,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as designationService from '../services/designationService.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await designationService.listDesignations();
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const designation_name = requireNonEmptyString(req.body.designation_name, 'Designation name');
  const description = optionalString(req.body.description);
  const created = await designationService.createDesignation({ designation_name, description });
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Designation ID');
  const designation_name = requireNonEmptyString(req.body.designation_name, 'Designation name');
  const description = optionalString(req.body.description);
  const updated = await designationService.updateDesignation(id, { designation_name, description });
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Designation ID');
  await designationService.deleteDesignation(id);
  res.json({ success: true, message: 'Designation deleted successfully.' });
});
