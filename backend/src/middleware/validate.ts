import { AppError } from '../utils/appError.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-()\s]{7,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${field} is required.`, 400);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateEmail(value: unknown, field = 'Email', required = true): string | null {
  if ((value === undefined || value === null || String(value).trim() === '') && !required) {
    return null;
  }
  const str = requireNonEmptyString(value, field).toLowerCase();
  if (!EMAIL_REGEX.test(str)) {
    throw new AppError(`Invalid ${field.toLowerCase()} format.`, 400);
  }
  return str;
}

export function validatePhone(value: unknown, required = false): string | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new AppError('Phone number is required.', 400);
    return null;
  }
  const str = String(value).trim();
  if (!PHONE_REGEX.test(str)) {
    throw new AppError('Invalid phone number format (7-20 digits or +-() characters).', 400);
  }
  return str;
}

export function validateDate(value: unknown, field: string, required = true): string | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new AppError(`${field} is required.`, 400);
    return null;
  }
  const str = String(value).trim();
  if (!DATE_REGEX.test(str) || Number.isNaN(Date.parse(str))) {
    throw new AppError(`${field} must be a valid date (YYYY-MM-DD).`, 400);
  }
  return str;
}

export function validatePositiveInt(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${field} must be a positive integer.`, 400);
  }
  return num;
}

export function validateNonNegativeNumber(value: unknown, field: string, strictPositive = false): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new AppError(`${field} must be a valid number.`, 400);
  }
  if (strictPositive && num <= 0) {
    throw new AppError(`${field} must be greater than zero.`, 400);
  }
  if (!strictPositive && num < 0) {
    throw new AppError(`${field} cannot be negative.`, 400);
  }
  return Math.round(num * 100) / 100;
}

export function validateMonthYear(monthRaw: unknown, yearRaw: unknown): { month: number; year: number } {
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError('Payroll month must be an integer between 1 and 12.', 400);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError('Payroll year must be an integer between 2000 and 2100.', 400);
  }
  return { month, year };
}
