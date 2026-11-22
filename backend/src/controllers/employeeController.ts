import type { Request, Response } from 'express';
import {
  optionalString,
  requireNonEmptyString,
  validateDate,
  validateEmail,
  validatePhone,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as employeeService from '../services/employeeService.ts';
import { AppError } from '../utils/appError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

function parseEmployeePayload(body: Record<string, unknown>): employeeService.EmployeePayload {
  const employee_code = requireNonEmptyString(body.employee_code, 'Employee code').toUpperCase();
  const first_name = requireNonEmptyString(body.first_name, 'First name');
  const last_name = optionalString(body.last_name);
  const gender = optionalString(body.gender);
  const date_of_birth = validateDate(body.date_of_birth, 'Date of birth', false);
  const phone = validatePhone(body.phone, false);
  const email = validateEmail(body.email, 'Email', true);
  const address = optionalString(body.address);
  const hire_date = validateDate(body.hire_date, 'Hire date', true)!;
  const department_id = validatePositiveInt(body.department_id, 'Department');
  const designation_id = validatePositiveInt(body.designation_id, 'Designation');

  if (date_of_birth && date_of_birth >= hire_date) {
    throw new AppError('Date of birth must be earlier than hire date.', 400);
  }

  const rawStatus = String(body.employment_status || 'ACTIVE').toUpperCase();
  if (!['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(rawStatus)) {
    throw new AppError('Invalid employment status.', 400);
  }

  return {
    employee_code,
    first_name,
    last_name,
    gender,
    date_of_birth,
    phone,
    email,
    address,
    hire_date,
    department_id,
    designation_id,
    employment_status: rawStatus as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters: employeeService.EmployeeFilters = {
    search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
    department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
    designation_id: req.query.designation_id ? Number(req.query.designation_id) : undefined,
    status: typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined,
  };
  const rows = await employeeService.listEmployees(filters);
  res.json({ success: true, data: rows });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Employee ID');
  const employee = await employeeService.getEmployeeById(id);
  res.json({ success: true, data: employee });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseEmployeePayload(req.body);
  const created = await employeeService.createEmployee(payload);
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Employee ID');
  const payload = parseEmployeePayload(req.body);
  const updated = await employeeService.updateEmployee(id, payload);
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Employee ID');
  const result = await employeeService.deleteOrDeactivateEmployee(id);
  res.json({ success: true, ...result });
});
