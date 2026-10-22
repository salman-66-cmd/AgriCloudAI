import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/users', AdminController.listUsers);
router.patch('/users/:id/role', AdminController.updateUserRole);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/metrics', AdminController.getSystemMetrics);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/simulator', AdminController.getSimulatorStatus);
router.post('/simulator/control', AdminController.controlSimulator);

export default router;
