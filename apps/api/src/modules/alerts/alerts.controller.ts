import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { broadcastAlert } from '../../realtime/socket.js';

export class AlertsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { status, severity, fieldId, farmId, limit = '100' } = req.query;

      const whereClause: any = {};
      if (status) whereClause.status = String(status);
      if (severity) whereClause.severity = String(severity);
      if (fieldId) whereClause.fieldId = String(fieldId);

      if (farmId) {
        whereClause.field = { farmId: String(farmId) };
      } else if (user.role !== 'ADMIN') {
        whereClause.field = { farm: { ownerId: user.id } };
      }

      const alerts = await prisma.alert.findMany({
        where: whereClause,
        include: {
          field: {
            select: {
              id: true,
              name: true,
              farm: { select: { id: true, name: true } },
            },
          },
          sensor: {
            select: {
              id: true,
              deviceCode: true,
              type: true,
              unit: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
      });

      // Quick summary counts
      const counts = await prisma.alert.groupBy({
        by: ['status', 'severity'],
        where: user.role === 'ADMIN' ? {} : { field: { farm: { ownerId: user.id } } },
        _count: true,
      });

      res.json({
        success: true,
        data: {
          alerts,
          counts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const alert = await prisma.alert.findUnique({
        where: { id },
        include: {
          field: {
            include: {
              farm: true,
              crop: true,
            },
          },
          sensor: true,
        },
      });

      if (!alert) {
        throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && alert.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to view this alert', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: { alert },
      });
    } catch (error) {
      next(error);
    }
  }

  static async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.alert.findUnique({
        where: { id },
        include: { field: { include: { farm: true } } },
      });

      if (!existing) {
        throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to acknowledge this alert', 403, 'FORBIDDEN');
      }

      const updated = await prisma.alert.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          acknowledgedBy: user.name,
        },
      });

      broadcastAlert(updated, existing.fieldId);

      res.json({
        success: true,
        data: { alert: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { note } = req.body;

      const existing = await prisma.alert.findUnique({
        where: { id },
        include: { field: { include: { farm: true } } },
      });

      if (!existing) {
        throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to resolve this alert', 403, 'FORBIDDEN');
      }

      const updated = await prisma.alert.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: user.name + (note ? ` (${note})` : ''),
        },
      });

      broadcastAlert(updated, existing.fieldId);

      res.json({
        success: true,
        data: { alert: updated },
      });
    } catch (error) {
      next(error);
    }
  }
}
