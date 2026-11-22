import { Router } from 'express';
import * as designationController from '../controllers/designationController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();
router.use(requireAuth);

router.get('/', designationController.list);
router.post('/', designationController.create);
router.put('/:id', designationController.update);
router.delete('/:id', designationController.remove);

export default router;
