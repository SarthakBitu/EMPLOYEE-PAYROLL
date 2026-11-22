import { Router } from 'express';
import * as deductionController from '../controllers/deductionController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', deductionController.list);
router.post('/', deductionController.create);
router.put('/:id', deductionController.update);
router.delete('/:id', deductionController.remove);

export default router;
