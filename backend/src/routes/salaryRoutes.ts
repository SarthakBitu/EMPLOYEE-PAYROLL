import { Router } from 'express';
import * as salaryController from '../controllers/salaryController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', salaryController.listAll);
router.get('/:employeeId', salaryController.getByEmployee);
router.post('/', salaryController.create);
router.put('/:id', salaryController.update);

export default router;
