import { Router } from 'express';
import { CropsController } from './crops.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { CropSchema } from '@agricloud/shared';

const router = Router();

router.use(requireAuth);

router.get('/', CropsController.list);
router.get('/:id', CropsController.getById);
router.post('/', requireRole('ADMIN'), validate(CropSchema), CropsController.create);

export default router;
