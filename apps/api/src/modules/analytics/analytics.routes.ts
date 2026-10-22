import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', AnalyticsController.getOverview);
router.get('/irrigation', AnalyticsController.getIrrigationAnalytics);
router.get('/sensors', AnalyticsController.getSensorAnalytics);
router.get('/export/csv', AnalyticsController.exportCSV);

export default router;
