import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/authMiddleware.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import * as reportController from './controllers/reportController.ts';
import allowanceRoutes from './routes/allowanceRoutes.ts';
import attendanceRoutes from './routes/attendanceRoutes.ts';
import authRoutes from './routes/authRoutes.ts';
import deductionRoutes from './routes/deductionRoutes.ts';
import departmentRoutes from './routes/departmentRoutes.ts';
import designationRoutes from './routes/designationRoutes.ts';
import employeeRoutes from './routes/employeeRoutes.ts';
import payrollRoutes from './routes/payrollRoutes.ts';
import reportRoutes from './routes/reportRoutes.ts';
import salaryRoutes from './routes/salaryRoutes.ts';

export function registerApiRoutes(app: Express): void {
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok', database: 'mysql' });
  });

  app.use('/api/auth', authRoutes);
  app.get('/api/dashboard/summary', requireAuth, reportController.dashboardSummary);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/designations', designationRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/salaries', salaryRoutes);
  app.use('/api/allowances', allowanceRoutes);
  app.use('/api/deductions', deductionRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/reports', reportRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
  });

  app.use(errorHandler);
}

export function createApiApp(): Express {
  const app = express();
  registerApiRoutes(app);
  return app;
}
