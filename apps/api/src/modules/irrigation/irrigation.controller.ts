import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import { broadcastIrrigationEvent } from '../../realtime/socket.js';
import { IrrigationDecisionEngine } from '../../jobs/irrigationEngine.js';

export class IrrigationController {
  static async getFieldIrrigation(req: Request, res: Response, next: NextFunction) {
    try {
      const { fieldId } = req.params;

      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: {
          irrigationController: true,
          irrigationSettings: true,
          irrigationEvents: {
            orderBy: { startTime: 'desc' },
            take: 5,
          },
          sensors: {
            where: { type: { in: ['SOIL_MOISTURE', 'RAINFALL'] } },
            include: {
              readings: {
                orderBy: { recordedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      const activeEvent = await prisma.irrigationEvent.findFirst({
        where: { fieldId, status: 'RUNNING' },
      });

      const moistureSensor = field.sensors.find((s) => s.type === 'SOIL_MOISTURE');
      const rainSensor = field.sensors.find((s) => s.type === 'RAINFALL');

      const currentMoisture = moistureSensor?.readings[0]?.value ?? null;
      const moistureDate = moistureSensor?.readings[0]?.recordedAt ?? null;
      const recentRain = rainSensor?.readings[0]?.value ?? 0;

      // Calculate real-time recommendation
      const settings = field.irrigationSettings;
      const decision = settings
        ? IrrigationDecisionEngine.evaluate({
            fieldId: field.id,
            autoMode: settings.autoMode,
            minMoistureThreshold: settings.minMoistureThreshold,
            targetMoistureThreshold: settings.targetMoistureThreshold,
            maxRunDurationSeconds: settings.maxRunDurationSeconds,
            cooldownMinutes: settings.cooldownMinutes,
            suspendOnRain: settings.suspendOnRain,
            rainThresholdMm: settings.rainThresholdMm,
            currentMoisture,
            moistureRecordedAt: moistureDate,
            recentRainfallMm: recentRain,
            activeEvent: activeEvent ? { id: activeEvent.id, startTime: activeEvent.startTime, mode: activeEvent.mode } : null,
          })
        : null;

      res.json({
        success: true,
        data: {
          fieldId: field.id,
          fieldName: field.name,
          controller: field.irrigationController,
          settings: field.irrigationSettings,
          activeEvent,
          recentEvents: field.irrigationEvents,
          currentMoisture,
          recentRain,
          decision,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async start(req: Request, res: Response, next: NextFunction) {
    try {
      const { fieldId } = req.params;
      const user = req.user!;
      const { durationSeconds = 300, reason = 'Manual command initiated by user' } = req.body;

      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: {
          farm: true,
          irrigationController: true,
          irrigationSettings: true,
        },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to control irrigation on this field', 403, 'FORBIDDEN');
      }

      // Safety Check 1: Duplicate run check
      const existingRunning = await prisma.irrigationEvent.findFirst({
        where: { fieldId, status: 'RUNNING' },
      });

      if (existingRunning) {
        throw new AppError('An irrigation cycle is already running on this field', 409, 'ALREADY_RUNNING');
      }

      // Safety Check 2: Max duration safety
      const maxAllowed = field.irrigationSettings?.maxRunDurationSeconds || 1800;
      const runDuration = Math.min(durationSeconds, maxAllowed);

      const event = await prisma.irrigationEvent.create({
        data: {
          fieldId,
          startTime: new Date(),
          mode: 'MANUAL',
          status: 'RUNNING',
          triggeredBy: user.name,
          reason,
        },
      });

      if (field.irrigationController) {
        await prisma.irrigationController.update({
          where: { id: field.irrigationController.id },
          data: { status: 'RUNNING', lastCommandAt: new Date() },
        });
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'IRRIGATION_START',
          entityType: 'IRRIGATION',
          entityId: event.id,
          metadata: JSON.stringify({ fieldId, durationSeconds: runDuration, reason }),
        },
      });

      broadcastIrrigationEvent(event, fieldId);

      res.status(201).json({
        success: true,
        data: {
          event,
          message: `Simulated pump activated for field "${field.name}". Duration limit: ${Math.round(runDuration / 60)} minutes.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async stop(req: Request, res: Response, next: NextFunction) {
    try {
      const { fieldId } = req.params;
      const user = req.user!;
      const { reason = 'Manual stop requested by user' } = req.body;

      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: {
          farm: true,
          irrigationController: true,
        },
      });

      if (!field) {
        throw new AppError('Field not found', 404, 'FIELD_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && field.farm.ownerId !== user.id) {
        throw new AppError('You do not have permission to control irrigation on this field', 403, 'FORBIDDEN');
      }

      const activeEvent = await prisma.irrigationEvent.findFirst({
        where: { fieldId, status: 'RUNNING' },
      });

      if (!activeEvent) {
        throw new AppError('No active irrigation cycle is running on this field', 400, 'NO_ACTIVE_IRRIGATION');
      }

      const now = new Date();
      const durationSeconds = Math.round((now.getTime() - new Date(activeEvent.startTime).getTime()) / 1000);
      const estimatedWaterLiters = +(durationSeconds * 22.5).toFixed(0); // 22.5 L/sec flow delivery

      const updated = await prisma.irrigationEvent.update({
        where: { id: activeEvent.id },
        data: {
          endTime: now,
          durationSeconds,
          estimatedWaterLiters,
          status: 'STOPPED_BY_USER',
          reason,
        },
      });

      if (field.irrigationController) {
        await prisma.irrigationController.update({
          where: { id: field.irrigationController.id },
          data: { status: 'IDLE', lastCommandAt: now },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'IRRIGATION_STOP',
          entityType: 'IRRIGATION',
          entityId: updated.id,
          metadata: JSON.stringify({ durationSeconds, estimatedWaterLiters }),
        },
      });

      broadcastIrrigationEvent(updated, fieldId);

      res.json({
        success: true,
        data: {
          event: updated,
          message: `Irrigation halted. Elapsed: ${durationSeconds}s, Estimated Water Used: ${estimatedWaterLiters.toLocaleString()} Liters.`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
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
        throw new AppError('You do not have permission to configure this field', 403, 'FORBIDDEN');
      }

      const {
        autoMode,
        minMoistureThreshold,
        targetMoistureThreshold,
        maxRunDurationSeconds,
        cooldownMinutes,
        suspendOnRain,
        rainThresholdMm,
      } = req.body;

      const settings = await prisma.irrigationSettings.upsert({
        where: { fieldId },
        create: {
          fieldId,
          autoMode: Boolean(autoMode),
          minMoistureThreshold: minMoistureThreshold !== undefined ? parseFloat(minMoistureThreshold) : 35.0,
          targetMoistureThreshold: targetMoistureThreshold !== undefined ? parseFloat(targetMoistureThreshold) : 65.0,
          maxRunDurationSeconds: maxRunDurationSeconds !== undefined ? parseInt(maxRunDurationSeconds, 10) : 600,
          cooldownMinutes: cooldownMinutes !== undefined ? parseInt(cooldownMinutes, 10) : 60,
          suspendOnRain: suspendOnRain !== undefined ? Boolean(suspendOnRain) : true,
          rainThresholdMm: rainThresholdMm !== undefined ? parseFloat(rainThresholdMm) : 5.0,
        },
        update: {
          ...(autoMode !== undefined && { autoMode: Boolean(autoMode) }),
          ...(minMoistureThreshold !== undefined && { minMoistureThreshold: parseFloat(minMoistureThreshold) }),
          ...(targetMoistureThreshold !== undefined && { targetMoistureThreshold: parseFloat(targetMoistureThreshold) }),
          ...(maxRunDurationSeconds !== undefined && { maxRunDurationSeconds: parseInt(maxRunDurationSeconds, 10) }),
          ...(cooldownMinutes !== undefined && { cooldownMinutes: parseInt(cooldownMinutes, 10) }),
          ...(suspendOnRain !== undefined && { suspendOnRain: Boolean(suspendOnRain) }),
          ...(rainThresholdMm !== undefined && { rainThresholdMm: parseFloat(rainThresholdMm) }),
        },
      });

      // Also sync field moisture threshold
      if (minMoistureThreshold !== undefined) {
        await prisma.field.update({
          where: { id: fieldId },
          data: { moistureThreshold: parseFloat(minMoistureThreshold) },
        });
      }

      res.json({
        success: true,
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { fieldId, farmId, mode, status, limit = '50' } = req.query;

      const whereClause: any = {};
      if (fieldId) whereClause.fieldId = String(fieldId);
      if (mode) whereClause.mode = String(mode);
      if (status) whereClause.status = String(status);

      if (farmId) {
        whereClause.field = { farmId: String(farmId) };
      } else if (user.role !== 'ADMIN') {
        whereClause.field = { farm: { ownerId: user.id } };
      }

      const events = await prisma.irrigationEvent.findMany({
        where: whereClause,
        include: {
          field: {
            select: {
              id: true,
              name: true,
              farm: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startTime: 'desc' },
        take: parseInt(String(limit), 10),
      });

      res.json({
        success: true,
        data: { events },
      });
    } catch (error) {
      next(error);
    }
  }
}
