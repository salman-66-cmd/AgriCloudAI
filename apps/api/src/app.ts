import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { swaggerDocument } from './swagger.js';

import authRoutes from './modules/auth/auth.routes.js';
import farmsRoutes from './modules/farms/farms.routes.js';
import fieldsRoutes from './modules/fields/fields.routes.js';
import cropsRoutes from './modules/crops/crops.routes.js';
import sensorsRoutes from './modules/sensors/sensors.routes.js';
import readingsRoutes from './modules/readings/readings.routes.js';
import irrigationRoutes from './modules/irrigation/irrigation.routes.js';
import alertsRoutes from './modules/alerts/alerts.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & Parser Middlewares
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In development, allow localhost origins
        if (config.nodeEnv !== 'production' && origin.includes('localhost')) {
          return callback(null, true);
        }
        callback(null, true); // Permissive for local development demonstration
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // Health and Readiness Checks (Cloud deployment requirement)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  app.get('/ready', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        error: err.message,
      });
    }
  });

  // Swagger API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Mount versioned REST API routes under /api/v1
  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/farms', farmsRoutes);
  v1.use('/', fieldsRoutes);
  v1.use('/crops', cropsRoutes);
  v1.use('/', sensorsRoutes);
  v1.use('/readings', readingsRoutes);
  v1.use('/', irrigationRoutes);
  v1.use('/alerts', alertsRoutes);
  v1.use('/analytics', analyticsRoutes);
  v1.use('/admin', adminRoutes);

  app.use(config.apiPrefix, v1);

  // 404 Route Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
