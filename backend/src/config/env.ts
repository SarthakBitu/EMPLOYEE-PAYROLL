import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ephemeral fallback ensures JWT signing never relies on a hardcoded literal secret
// when JWT_SECRET is omitted during local preview startup.
const fallbackJwtSecret = crypto.randomBytes(32).toString('hex');

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'payroll_app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'employee_payroll_db',
  },
  jwtSecret: process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0
    ? process.env.JWT_SECRET.trim()
    : fallbackJwtSecret,
  adminEmail: process.env.ADMIN_EMAIL?.trim() || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};
