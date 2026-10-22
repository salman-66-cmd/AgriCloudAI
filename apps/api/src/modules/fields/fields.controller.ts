import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

export class FieldsController {
  static async listByFarm(req: Request, res: Response, next: NextFunction) {
    try {
      const { farmId } = req.params;
      const user = req.user!;

      const farm = await prisma.farm.findUnique({ where: { id: farmId } });
      if (!farm) {
        throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && farm.ownerId !== user.id) {
        throw new AppError('You do not have access to this farm', 403, 'FORBIDDEN');
      }

      const fields = await prisma.field.findMany({
        where: { farmId },
        include: {
          crop: true,
          sensors: true,
          irrigationController: true,
          irrigationSettings: true,
          _count: {
            select: { alerts: { where: { status: 'ACTIVE' } } },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        data: { fields },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const field = await prisma.field.findUnique({
        where: { id },
        include: {
          farm: true,
          crop: true,
          sensors: {
            include: {
              readings: {
                orderBy: { recordedAt: 'desc' },
                take: 1,
              },
            },
          },
          irrigationController: true,
          irrigationSettings: true,
          irrigationEvents: {
            orderBy: { startTime: 'desc' },
            take: 10,
          },
          alerts: {
            where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && field.farm.ownerId !== user.id) {
        throw new AppError('You do not have access to this field', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: { field },
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { farmId } = req.params;
      const user = req.user!;
      const { name, area, cropId, moistureThreshold, irrigationEnabled } = req.body;

      const farm = await prisma.farm.findUnique({ where: { id: farmId } });
      if (!farm) {
        throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && farm.ownerId !== user.id) {
        throw new AppError('You do not have access to this farm', 403, 'FORBIDDEN');
      }

      const field = await prisma.field.create({
        data: {
          farmId,
          name,
          area: parseFloat(area),
          cropId: cropId || null,
          moistureThreshold: moistureThreshold !== undefined ? parseFloat(moistureThreshold) : 35.0,
          irrigationEnabled: irrigationEnabled !== undefined ? Boolean(irrigationEnabled) : true,
        },
      });

      // Automatically initialize default irrigation controller and settings for this field
      await prisma.irrigationController.create({
        data: {
          fieldId: field.id,
          controllerCode: `CTRL-${field.name.substring(0, 3).toUpperCase()}-${Date.now().toString(36).substring(4).toUpperCase()}`,
          status: 'IDLE',
          isSimulated: true,
        },
      });

      await prisma.irrigationSettings.create({
        data: {
          fieldId: field.id,
          autoMode: false,
          minMoistureThreshold: field.moistureThreshold,
          targetMoistureThreshold: field.moistureThreshold + 25.0,
          maxRunDurationSeconds: 600,
          cooldownMinutes: 60,
          suspendOnRain: true,
          rainThresholdMm: 5.0,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entityType: 'FIELD',
          entityId: field.id,
          metadata: JSON.stringify({ name: field.name, farmId }),
        },
      });

      res.status(201).json({
        success: true,
        data: { field },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.field.findUnique({
        where: { id },
        include: { farm: true },
      });

      if (!existing) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to modify this field', 403, 'FORBIDDEN');
      }

      const { name, area, cropId, moistureThreshold, irrigationEnabled } = req.body;

      const updated = await prisma.field.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(area !== undefined && { area: parseFloat(area) }),
          ...(cropId !== undefined && { cropId: cropId || null }),
          ...(moistureThreshold !== undefined && { moistureThreshold: parseFloat(moistureThreshold) }),
          ...(irrigationEnabled !== undefined && { irrigationEnabled: Boolean(irrigationEnabled) }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          entityType: 'FIELD',
          entityId: id,
          metadata: JSON.stringify(req.body),
        },
      });

      res.json({
        success: true,
        data: { field: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.field.findUnique({
        where: { id },
        include: { farm: true },
      });

      if (!existing) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && existing.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to delete this field', 403, 'FORBIDDEN');
      }

      await prisma.field.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          entityType: 'FIELD',
          entityId: id,
          metadata: JSON.stringify({ name: existing.name }),
        },
      });

      res.json({
        success: true,
        message: 'Field deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
