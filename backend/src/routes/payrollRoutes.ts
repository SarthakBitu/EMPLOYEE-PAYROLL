import { Router } from 'express';
import * as payrollController from '../controllers/payrollController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', payrollController.list);
router.get('/preview', payrollController.preview);
router.get('/monthly/:year/:month', payrollController.getMonthly);
router.get('/:id', payrollController.getOne);
router.post('/generate', payrollController.generate);
router.patch('/:id/pay', payrollController.markAsPaid);

export default router;
