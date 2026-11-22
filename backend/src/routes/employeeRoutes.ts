import { Router } from 'express';
import * as employeeController from '../controllers/employeeController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', employeeController.list);
router.get('/:id', employeeController.getOne);
router.post('/', employeeController.create);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.remove);

export default router;
