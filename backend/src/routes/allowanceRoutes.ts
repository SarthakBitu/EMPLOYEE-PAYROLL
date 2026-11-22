import { Router } from 'express';
import * as allowanceController from '../controllers/allowanceController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', allowanceController.list);
router.post('/', allowanceController.create);
router.put('/:id', allowanceController.update);
router.delete('/:id', allowanceController.remove);

export default router;
