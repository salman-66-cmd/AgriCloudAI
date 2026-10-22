import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { broadcastSensorReading } from '../../realtime/socket.js';
import { AlertProcessor } from '../../jobs/alertProcessor.js';

export class ReadingsController {
  static async getLatest(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { farmId, fieldId } = req.query;

      const whereClause: any = {};
      if (fieldId) {
        whereClause.id = String(fieldId);
      } else if (farmId) {
        whereClause.farmId = String(farmId);
      } else if (user.role !== 'ADMIN') {
        whereClause.farm = { ownerId: user.id };
      }

      const fields = await prisma.field.findMany({
        where: whereClause,
        include: {
          farm: {
            select: { id: true, name: true },
          },
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
        },
      });

      const formatted = fields.map((f) => ({
        fieldId: f.id,
        fieldName: f.name,
        farmId: f.farm.id,
        farmName: f.farm.name,
        crop: f.crop?.name || 'Unassigned',
        moistureThreshold: f.moistureThreshold,
        irrigationStatus: f.irrigationController?.status || 'IDLE',
        sensors: f.sensors.map((s) => ({
          sensorId: s.id,
          deviceCode: s.deviceCode,
          type: s.type,
          unit: s.unit,
          status: s.status,
          isSimulated: s.isSimulated,
          lastSeenAt: s.lastSeenAt,
          latestValue: s.readings[0]?.value ?? null,
          recordedAt: s.readings[0]?.recordedAt ?? null,
        })),
      }));

      res.json({
        success: true,
        data: { fields: formatted },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { fieldId, sensorId, type, range = '24h' } = req.query;

      const now = new Date();
      let startTime = new Date(now.getTime() - 24 * 3600 * 1000);

      if (range === '1h') startTime = new Date(now.getTime() - 3600 * 1000);
      else if (range === '6h') startTime = new Date(now.getTime() - 6 * 3600 * 1000);
      else if (range === '24h') startTime = new Date(now.getTime() - 24 * 3600 * 1000);
      else if (range === '7d') startTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      else if (range === '30d') startTime = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      const whereClause: any = {
        recordedAt: { gte: startTime },
      };

      if (sensorId) {
        whereClause.sensorId = String(sensorId);
      } else if (fieldId || type) {
        whereClause.sensor = {};
        if (fieldId) whereClause.sensor.fieldId = String(fieldId);
        if (type) whereClause.sensor.type = String(type);
      }

      const readings = await prisma.sensorReading.findMany({
        where: whereClause,
        include: {
          sensor: {
            select: {
              deviceCode: true,
              type: true,
              unit: true,
              isSimulated: true,
              field: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { recordedAt: 'asc' },
        take: 1000,
      });

      res.json({
        success: true,
        data: { readings },
      });
    } catch (error) {
      next(error);
    }
  }

  static async ingest(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceCode, value, recordedAt, source = 'HARDWARE_ESP32', qualityStatus = 'GOOD' } = req.body;

      const sensor = await prisma.sensor.findUnique({
        where: { deviceCode },
        include: {
          field: {
            include: {
              farm: true,
              crop: true,
            },
          },
        },
      });

      if (!sensor) {
        throw new AppError(`Sensor with device code ${deviceCode} is not registered`, 404, 'SENSOR_NOT_FOUND');
      }

      const readingDate = recordedAt ? new Date(recordedAt) : new Date();

      const reading = await prisma.sensorReading.create({
        data: {
          sensorId: sensor.id,
          value: parseFloat(value),
          recordedAt: readingDate,
          source,
          qualityStatus,
        },
      });

      await prisma.sensor.update({
        where: { id: sensor.id },
        data: {
          status: 'ONLINE',
          lastSeenAt: readingDate,
        },
      });

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
