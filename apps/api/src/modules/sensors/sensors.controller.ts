import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { SENSOR_UNITS, SensorType } from '@agricloud/shared';
import { broadcastSensorReading } from '../../realtime/socket.js';
import { AlertProcessor } from '../../jobs/alertProcessor.js';

export class SensorsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { fieldId, type, status } = req.query;

      const whereClause: any = {};
      if (fieldId) whereClause.fieldId = String(fieldId);
      if (type) whereClause.type = String(type);
      if (status) whereClause.status = String(status);

      if (user.role !== 'ADMIN') {
        whereClause.field = {
          farm: { ownerId: user.id },
        };
      }

      const sensors = await prisma.sensor.findMany({
        where: whereClause,
        include: {
          field: {
            include: {
              farm: {
                select: { id: true, name: true },
              },
            },
          },
          readings: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { sensors },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByField(req: Request, res: Response, next: NextFunction) {
    try {
      const { fieldId } = req.params;
      const user = req.user!;

      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: { farm: true },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && field.farm.ownerId !== user.id) {
        throw new AppError('You do not have access to this field', 403, 'FORBIDDEN');
      }

      const sensors = await prisma.sensor.findMany({
        where: { fieldId },
        include: {
          readings: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { type: 'asc' },
      });

      res.json({
        success: true,
        data: { sensors },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: {
          field: {
            include: {
              farm: true,
              crop: true,
            },
          },
          readings: {
            orderBy: { recordedAt: 'desc' },
            take: 50,
          },
          alerts: {
            where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!sensor) {
        throw new AppError('Sensor not found', 404, 'SENSOR_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && sensor.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to view this sensor', 403, 'FORBIDDEN');
      }

      res.json({
        success: true,
        data: { sensor },
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { fieldId, deviceCode, type, unit, isSimulated } = req.body;

      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: { farm: true },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to register sensors on this field', 403, 'FORBIDDEN');
      }

      // Check unique deviceCode
      const existing = await prisma.sensor.findUnique({ where: { deviceCode } });
      if (existing) {
        throw new AppError(`A sensor with device code "${deviceCode}" already exists.`, 409, 'DEVICE_EXISTS');
      }

      const assignedUnit = unit || SENSOR_UNITS[type as SensorType] || '';

      const sensor = await prisma.sensor.create({
        data: {
          fieldId,
          deviceCode,
          type,
          unit: assignedUnit,
          status: 'ONLINE',
          isSimulated: isSimulated !== undefined ? Boolean(isSimulated) : true,
          lastSeenAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_SENSOR',
          entityType: 'SENSOR',
          entityId: sensor.id,
          metadata: JSON.stringify({ deviceCode, type, fieldId }),
        },
      });

      res.status(201).json({
        success: true,
        data: { sensor },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: { field: { include: { farm: true } } },
      });

      if (!sensor) {
        throw new AppError('Sensor not found', 404, 'SENSOR_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && sensor.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to modify this sensor', 403, 'FORBIDDEN');
      }

      const { status, isSimulated, unit } = req.body;

      const updated = await prisma.sensor.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(isSimulated !== undefined && { isSimulated: Boolean(isSimulated) }),
          ...(unit && { unit }),
        },
      });

      res.json({
        success: true,
        data: { sensor: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: { field: { include: { farm: true } } },
      });

      if (!sensor) {
        throw new AppError('Sensor not found', 404, 'SENSOR_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && sensor.field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to delete this sensor', 403, 'FORBIDDEN');
      }

      await prisma.sensor.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Sensor and historical readings removed',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReadings(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = '100', from, to } = req.query;

      const sensor = await prisma.sensor.findUnique({ where: { id } });
      if (!sensor) {
        throw new AppError('Sensor not found', 404, 'SENSOR_NOT_FOUND');
      }

      const whereClause: any = { sensorId: id };
      if (from || to) {
        whereClause.recordedAt = {};
        if (from) whereClause.recordedAt.gte = new Date(String(from));
        if (to) whereClause.recordedAt.lte = new Date(String(to));
      }

      const readings = await prisma.sensorReading.findMany({
        where: whereClause,
        orderBy: { recordedAt: 'asc' },
        take: parseInt(String(limit), 10),
      });

      res.json({
        success: true,
        data: { readings },
      });
    } catch (error) {
      next(error);
    }
  }

  static async ingestReading(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { value, source = 'API_INGEST', qualityStatus = 'GOOD', recordedAt } = req.body;

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: {
          field: {
            include: {
              crop: true,
              farm: true,
            },
          },
        },
      });

      if (!sensor) {
        throw new AppError('Sensor not found', 404, 'SENSOR_NOT_FOUND');
      }

      const readingDate = recordedAt ? new Date(recordedAt) : new Date();

      const reading = await prisma.sensorReading.create({
        data: {
          sensorId: sensor.id,
          value: parseFloat(value),
          source,
          qualityStatus,
          recordedAt: readingDate,
        },
      });

      await prisma.sensor.update({
        where: { id: sensor.id },
        data: {
          status: 'ONLINE',
          lastSeenAt: readingDate,
        },
      });

      // Broadcast over Socket.IO
      broadcastSensorReading(
        {
          id: reading.id,
          sensorId: sensor.id,
          deviceCode: sensor.deviceCode,
          type: sensor.type,
          unit: sensor.unit,
          value: reading.value,
          recordedAt: reading.recordedAt,
          fieldId: sensor.fieldId,
          farmId: sensor.field.farmId,
          isSimulated: sensor.isSimulated,
        },
        sensor.fieldId,
        sensor.field.farmId
      );

      // Evaluate alerts
      await AlertProcessor.evaluateReading({
        sensorId: sensor.id,
        value: reading.value,
        sensor: sensor as any,
      });

      res.status(201).json({
        success: true,
        data: { reading },
      });
    } catch (error) {
      next(error);
    }
  }
}
