import { Router } from 'express';
import { AlertsController } from './alerts.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(requireAuth);

router.get('/', AlertsController.list);
router.get('/:id', AlertsController.getById);
router.patch('/:id/acknowledge', requireRole('ADMIN', 'FARMER'), AlertsController.acknowledge);
router.patch('/:id/resolve', requireRole('ADMIN', 'FARMER'), AlertsController.resolve);

export default router;
