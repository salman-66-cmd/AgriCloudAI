import { Router } from 'express';
import { SensorsController } from './sensors.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { SensorRegisterSchema } from '@agricloud/shared';
import { ingestRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/fields/:fieldId/sensors', SensorsController.listByField);
router.post('/fields/:fieldId/sensors', requireRole('ADMIN', 'FARMER'), validate(SensorRegisterSchema), SensorsController.register);

router.get('/sensors', SensorsController.list);
router.post('/sensors', requireRole('ADMIN', 'FARMER'), validate(SensorRegisterSchema), SensorsController.register);
router.get('/sensors/:id', SensorsController.getById);
router.patch('/sensors/:id', requireRole('ADMIN', 'FARMER'), SensorsController.update);
router.delete('/sensors/:id', requireRole('ADMIN', 'FARMER'), SensorsController.delete);
router.get('/sensors/:id/readings', SensorsController.getReadings);
router.post('/sensors/:id/readings', ingestRateLimiter, SensorsController.ingestReading);

export default router;
