import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', attendanceController.list);
router.get('/stats', attendanceController.stats);
router.post('/', attendanceController.create);
router.put('/:id', attendanceController.update);
router.delete('/:id', attendanceController.remove);

export default router;
