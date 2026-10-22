import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { IoTSensorSimulator } from '../../jobs/simulator.js';

export class AdminController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { farms: true, auditLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminUser = req.user!;

      if (!['ADMIN', 'FARMER', 'VIEWER'].includes(role)) {
        throw new AppError('Invalid role specified', 400, 'INVALID_ROLE');
      }

      // Prevent admin from locking out self
      if (adminUser.id === id && role !== 'ADMIN') {
        throw new AppError('You cannot revoke your own administrator role', 400, 'CANNOT_DEMOTE_SELF');
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'UPDATE_ROLE',
          entityType: 'USER',
          entityId: id,
          metadata: JSON.stringify({ newRole: role }),
        },
      });

      res.json({
        success: true,
        data: { user: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminUser = req.user!;

      if (adminUser.id === id) {
        throw new AppError('You cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      await prisma.user.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'DELETE',
          entityType: 'USER',
          entityId: id,
          metadata: JSON.stringify({ email: user.email }),
        },
      });

      res.json({
        success: true,
        message: `User ${user.email} successfully removed`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSystemMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = process.uptime();

      // DB Ping benchmark
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseMs = Date.now() - dbStart;

      const [usersCount, farmsCount, fieldsCount, sensorsCount, readingsCount] = await Promise.all([
        prisma.user.count(),
        prisma.farm.count(),
        prisma.field.count(),
        prisma.sensor.count(),
        prisma.sensorReading.count(),
      ]);

      const simulator = IoTSensorSimulator.getInstance().getState();

      res.json({
        success: true,
        data: {
          system: {
            nodeVersion: process.version,
            platform: process.platform,
            uptimeSeconds: Math.round(uptimeSeconds),
            memory: {
              rssMb: +(memoryUsage.rss / 1024 / 1024).toFixed(1),
              heapUsedMb: +(memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
              heapTotalMb: +(memoryUsage.heapTotal / 1024 / 1024).toFixed(1),
            },
            database: {
              status: 'HEALTHY',
              responseTimeMs: dbResponseMs,
            },
          },
          counts: {
            users: usersCount,
            farms: farmsCount,
            fields: fieldsCount,
            sensors: sensorsCount,
            readings: readingsCount,
          },
          simulator,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '100', action, entityType } = req.query;

      const whereClause: any = {};
      if (action) whereClause.action = String(action);
      if (entityType) whereClause.entityType = String(entityType);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
      });

      res.json({
        success: true,
        data: { logs },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSimulatorStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const state = IoTSensorSimulator.getInstance().getState();
      res.json({
        success: true,
        data: { simulator: state },
      });
    } catch (error) {
      next(error);
    }
  }

  static async controlSimulator(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, intervalSeconds } = req.body;
      const sim = IoTSensorSimulator.getInstance();
      const user = req.user!;

      if (action === 'START') {
        sim.start();
      } else if (action === 'STOP') {
        sim.stop();
      } else if (action === 'TICK_NOW') {
        await sim.tick();
      }

      if (intervalSeconds !== undefined) {
        sim.setInterval(parseInt(intervalSeconds, 10));
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SIMULATOR_CONTROL',
          entityType: 'SYSTEM',
          metadata: JSON.stringify({ action, intervalSeconds }),
        },
      });

      res.json({
        success: true,
        data: { simulator: sim.getState() },
        message: `Simulator command "${action || 'UPDATE'}" executed successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
