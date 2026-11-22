import type { Request, Response } from 'express';
import {
  optionalString,
  requireNonEmptyString,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as departmentService from '../services/departmentService.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await departmentService.listDepartments();
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const department_name = requireNonEmptyString(req.body.department_name, 'Department name');
  const description = optionalString(req.body.description);
  const created = await departmentService.createDepartment({ department_name, description });
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Department ID');
  const department_name = requireNonEmptyString(req.body.department_name, 'Department name');
  const description = optionalString(req.body.description);
  const updated = await departmentService.updateDepartment(id, { department_name, description });
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Department ID');
  await departmentService.deleteDepartment(id);
  res.json({ success: true, message: 'Department deleted successfully.' });
});
