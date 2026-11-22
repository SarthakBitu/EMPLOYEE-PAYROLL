import type { Request, Response } from 'express';
import { requireNonEmptyString, validateEmail } from '../middleware/validate.ts';
import * as authService from '../services/authService.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const status = asyncHandler(async (_req: Request, res: Response) => {
  const data = await authService.getAuthStatus();
  res.json({ success: true, data });
});

export const setup = asyncHandler(async (req: Request, res: Response) => {
  const fullName = requireNonEmptyString(req.body.fullName ?? req.body.full_name, 'Full name');
  const email = validateEmail(req.body.email, 'Email', true)!;
  const password = requireNonEmptyString(req.body.password, 'Password');

  const result = await authService.setupInitialAdmin({ fullName, email, password });
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const email = validateEmail(req.body.email, 'Email', true)!;
  const password = requireNonEmptyString(req.body.password, 'Password');

  const result = await authService.loginAdmin(email, password);
  res.json({ success: true, data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});
