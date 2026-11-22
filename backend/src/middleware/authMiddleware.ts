import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { AppError } from '../utils/appError.ts';

export interface AuthPayload {
  sub: number;
  email: string;
  fullName: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please sign in.', 401);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AppError('Invalid authentication token.', 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    throw new AppError('Session expired or invalid token. Please sign in again.', 401);
  }
}
