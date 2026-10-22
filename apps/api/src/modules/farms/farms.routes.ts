import { Router } from 'express';
import { FarmsController } from './farms.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { FarmSchema } from '@agricloud/shared';

const router = Router();

router.use(requireAuth);

router.get('/', FarmsController.list);
router.post('/', requireRole('ADMIN', 'FARMER'), validate(FarmSchema), FarmsController.create);
router.get('/:id', FarmsController.getById);
router.patch('/:id', requireRole('ADMIN', 'FARMER'), FarmsController.update);
router.delete('/:id', requireRole('ADMIN', 'FARMER'), FarmsController.delete);

export default router;
