import type { Request, Response } from 'express';
import {
  optionalString,
  validateDate,
  validateNonNegativeNumber,
  validatePositiveInt,
} from '../middleware/validate.ts';
import * as attendanceService from '../services/attendanceService.ts';
import { AppError } from '../utils/appError.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'];

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters: attendanceService.AttendanceFilters = {
    date: typeof req.query.date === 'string' && req.query.date ? req.query.date : undefined,
    month: req.query.month ? Number(req.query.month) : undefined,
    year: req.query.year ? Number(req.query.year) : undefined,
    employee_id: req.query.employee_id ? Number(req.query.employee_id) : undefined,
    department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
    status: typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined,
  };
  const rows = await attendanceService.listAttendance(filters);
  res.json({ success: true, data: rows });
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const departmentId = req.query.department_id ? Number(req.query.department_id) : undefined;
  const data = await attendanceService.getAttendanceStats(month, year, departmentId);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const employee_id = validatePositiveInt(req.body.employee_id, 'Employee');
  const attendance_date = validateDate(req.body.attendance_date, 'Attendance date', true)!;
  const status = String(req.body.status || '').toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid attendance status.', 400);
  }
  const working_hours = validateNonNegativeNumber(req.body.working_hours ?? 0, 'Working hours');
  const overtime_hours = validateNonNegativeNumber(req.body.overtime_hours ?? 0, 'Overtime hours');
  if (working_hours > 24 || overtime_hours > 16) {
    throw new AppError('Working hours cannot exceed 24 and overtime cannot exceed 16 per day.', 400);
  }
  const remarks = optionalString(req.body.remarks);

  const created = await attendanceService.createAttendance({
    employee_id,
    attendance_date,
    status: status as attendanceService.AttendancePayload['status'],
    working_hours,
    overtime_hours,
    remarks,
  });
  res.status(201).json({ success: true, data: created });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Attendance ID');
  const status = String(req.body.status || '').toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid attendance status.', 400);
  }
  const working_hours = validateNonNegativeNumber(req.body.working_hours ?? 0, 'Working hours');
  const overtime_hours = validateNonNegativeNumber(req.body.overtime_hours ?? 0, 'Overtime hours');
  if (working_hours > 24 || overtime_hours > 16) {
    throw new AppError('Working hours cannot exceed 24 and overtime cannot exceed 16 per day.', 400);
  }
  const remarks = optionalString(req.body.remarks);

  const updated = await attendanceService.updateAttendance(id, {
    status: status as attendanceService.AttendancePayload['status'],
    working_hours,
    overtime_hours,
    remarks,
  });
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = validatePositiveInt(req.params.id, 'Attendance ID');
  await attendanceService.deleteAttendance(id);
  res.json({ success: true, message: 'Attendance record deleted successfully.' });
});
