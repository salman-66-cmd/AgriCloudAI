import { Router } from 'express';
import { FieldsController } from './fields.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { FieldSchema } from '@agricloud/shared';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/farms/:farmId/fields', FieldsController.listByFarm);
router.post('/farms/:farmId/fields', requireRole('ADMIN', 'FARMER'), validate(FieldSchema), FieldsController.create);
router.get('/fields/:id', FieldsController.getById);
router.patch('/fields/:id', requireRole('ADMIN', 'FARMER'), FieldsController.update);
router.delete('/fields/:id', requireRole('ADMIN', 'FARMER'), FieldsController.delete);

export default router;
