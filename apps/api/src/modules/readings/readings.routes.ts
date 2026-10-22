import { Router } from 'express';
import { ReadingsController } from './readings.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { SensorReadingIngestSchema } from '@agricloud/shared';
import { ingestRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.use(requireAuth);

router.get('/latest', ReadingsController.getLatest);
router.get('/history', ReadingsController.getHistory);
router.post('/ingest', ingestRateLimiter, validate(SensorReadingIngestSchema), ReadingsController.ingest);

export default router;
