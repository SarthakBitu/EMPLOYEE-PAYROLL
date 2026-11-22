import type { Request, Response } from 'express';
import * as reportService from '../services/reportService.ts';
import { asyncHandler } from '../utils/asyncHandler.ts';

export const dashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportService.getDashboardSummary();
  res.json({ success: true, data });
});

export const departmentSalary = asyncHandler(async (req: Request, res: Response) => {
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const minEmployees = req.query.min_employees ? Number(req.query.min_employees) : undefined;
  const rows = await reportService.getDepartmentSalaryReport({ month, year, minEmployees });
  res.json({ success: true, data: rows });
});

export const employeeSalary = asyncHandler(async (req: Request, res: Response) => {
  const month = req.query.month ? Number(req.query.month) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const department_id = req.query.department_id ? Number(req.query.department_id) : undefined;
  const rows = await reportService.getEmployeeSalaryReport({ month, year, department_id });
  res.json({ success: true, data: rows });
});

export const attendance = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const department_id = req.query.department_id ? Number(req.query.department_id) : undefined;
  const rows = await reportService.getAttendanceReport({ month, year, department_id });
  res.json({ success: true, data: rows });
});

export const monthlyPayroll = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const rows = await reportService.getMonthlyPayrollReport(year);
  res.json({ success: true, data: rows });
});

export const aboveDepartmentAverage = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await reportService.getAboveDepartmentAverageReport();
  res.json({ success: true, data: rows });
});
