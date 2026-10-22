import { Router } from 'express';
import { IrrigationController } from './irrigation.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { IrrigationStartSchema, IrrigationSettingsSchema } from '@agricloud/shared';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/fields/:fieldId/irrigation', IrrigationController.getFieldIrrigation);
router.post('/fields/:fieldId/irrigation/start', requireRole('ADMIN', 'FARMER'), validate(IrrigationStartSchema), IrrigationController.start);
router.post('/fields/:fieldId/irrigation/stop', requireRole('ADMIN', 'FARMER'), IrrigationController.stop);
router.patch('/fields/:fieldId/irrigation/settings', requireRole('ADMIN', 'FARMER'), validate(IrrigationSettingsSchema), IrrigationController.updateSettings);

router.get('/irrigation/events', IrrigationController.listEvents);

export default router;
