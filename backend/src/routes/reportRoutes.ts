import { Router } from 'express';
import * as reportController from '../controllers/reportController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/dashboard-summary', reportController.dashboardSummary);
router.get('/department-salary', reportController.departmentSalary);
router.get('/employee-salary', reportController.employeeSalary);
router.get('/attendance', reportController.attendance);
router.get('/monthly-payroll', reportController.monthlyPayroll);
router.get('/above-department-average', reportController.aboveDepartmentAverage);

export default router;
