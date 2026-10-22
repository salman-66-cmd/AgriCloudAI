import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';

export class AnalyticsController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const farmFilter = user.role === 'ADMIN' ? {} : { ownerId: user.id };
      const fieldFilter = user.role === 'ADMIN' ? {} : { farm: { ownerId: user.id } };

      const [totalFarms, totalFields, totalCrops] = await Promise.all([
        prisma.farm.count({ where: farmFilter }),
        prisma.field.count({ where: fieldFilter }),
        prisma.crop.count(),
      ]);

      const sensors = await prisma.sensor.findMany({
        where: { field: fieldFilter },
        select: { id: true, status: true, type: true, isSimulated: true },
      });

      const totalSensors = sensors.length;
      const onlineSensors = sensors.filter((s) => s.status === 'ONLINE').length;
      const offlineSensors = sensors.filter((s) => s.status === 'OFFLINE').length;
      const faultSensors = sensors.filter((s) => s.status === 'FAULT').length;

      // Active alerts
      const activeAlerts = await prisma.alert.count({
        where: {
          field: fieldFilter,
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        },
      });

      const criticalAlerts = await prisma.alert.count({
        where: {
          field: fieldFilter,
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          severity: 'CRITICAL',
        },
      });

      // Active pumps running
      const activePumps = await prisma.irrigationEvent.count({
        where: {
          field: fieldFilter,
          status: 'RUNNING',
        },
      });

      // Latest readings for averages
      const moistureSensors = sensors.filter((s) => s.type === 'SOIL_MOISTURE');
      let avgMoisture = 0;
      if (moistureSensors.length > 0) {
        const latestMoistures = await prisma.sensorReading.findMany({
          where: { sensorId: { in: moistureSensors.map((s) => s.id) } },
          orderBy: { recordedAt: 'desc' },
          take: moistureSensors.length,
          distinct: ['sensorId'],
        });

        if (latestMoistures.length > 0) {
          const sum = latestMoistures.reduce((acc, curr) => acc + curr.value, 0);
          avgMoisture = +(sum / latestMoistures.length).toFixed(1);
        }
      }

      // Latest temperature
      const tempSensors = sensors.filter((s) => s.type === 'TEMPERATURE');
      let avgTemp = 24.0;
      if (tempSensors.length > 0) {
        const latestTemps = await prisma.sensorReading.findMany({
          where: { sensorId: { in: tempSensors.map((s) => s.id) } },
          orderBy: { recordedAt: 'desc' },
          take: tempSensors.length,
          distinct: ['sensorId'],
        });
        if (latestTemps.length > 0) {
          const sum = latestTemps.reduce((acc, curr) => acc + curr.value, 0);
          avgTemp = +(sum / latestTemps.length).toFixed(1);
        }
      }

      // Latest humidity
      const humSensors = sensors.filter((s) => s.type === 'HUMIDITY');
      let avgHumidity = 55.0;
      if (humSensors.length > 0) {
        const latestHum = await prisma.sensorReading.findMany({
          where: { sensorId: { in: humSensors.map((s) => s.id) } },
          orderBy: { recordedAt: 'desc' },
          take: humSensors.length,
          distinct: ['sensorId'],
        });
        if (latestHum.length > 0) {
          const sum = latestHum.reduce((acc, curr) => acc + curr.value, 0);
          avgHumidity = +(sum / latestHum.length).toFixed(1);
        }
      }

      // Total estimated water delivered in last 24h
      const past24h = new Date(Date.now() - 24 * 3600 * 1000);
      const recentEvents = await prisma.irrigationEvent.findMany({
        where: {
          field: fieldFilter,
          startTime: { gte: past24h },
        },
        select: { estimatedWaterLiters: true, durationSeconds: true },
      });

      const waterUsed24hLiters = recentEvents.reduce((acc, curr) => acc + (curr.estimatedWaterLiters || 0), 0);

      res.json({
        success: true,
        data: {
          farms: { total: totalFarms },
          fields: { total: totalFields },
          crops: { total: totalCrops },
          sensors: {
            total: totalSensors,
            online: onlineSensors,
            offline: offlineSensors,
            fault: faultSensors,
          },
          currentConditions: {
            avgSoilMoisture: avgMoisture,
            avgTemperature: avgTemp,
            avgHumidity: avgHumidity,
          },
          irrigation: {
            activePumps,
            waterUsed24hLiters,
            eventsCount24h: recentEvents.length,
          },
          alerts: {
            active: activeAlerts,
            critical: criticalAlerts,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getIrrigationAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const fieldFilter = user.role === 'ADMIN' ? {} : { farm: { ownerId: user.id } };

      const events = await prisma.irrigationEvent.findMany({
        where: { field: fieldFilter },
        include: {
          field: { select: { name: true, area: true } },
        },
        orderBy: { startTime: 'desc' },
        take: 100,
      });

      // Group by field
      const byField: Record<string, { fieldName: string; totalLiters: number; totalSeconds: number; eventCount: number }> = {};
      // Group by mode (auto vs manual)
      const byMode = { AUTOMATIC: 0, MANUAL: 0 };

      for (const ev of events) {
        const fId = ev.fieldId;
        if (!byField[fId]) {
          byField[fId] = {
            fieldName: ev.field.name,
            totalLiters: 0,
            totalSeconds: 0,
            eventCount: 0,
          };
        }
        byField[fId].totalLiters += ev.estimatedWaterLiters || 0;
        byField[fId].totalSeconds += ev.durationSeconds || 0;
        byField[fId].eventCount++;

        if (ev.mode === 'AUTOMATIC') byMode.AUTOMATIC += ev.estimatedWaterLiters || 0;
        else byMode.MANUAL += ev.estimatedWaterLiters || 0;
      }

      res.json({
        success: true,
        data: {
          totalEvents: events.length,
          byField: Object.values(byField),
          byMode,
          recentEvents: events.slice(0, 15),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSensorAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const fieldFilter = user.role === 'ADMIN' ? {} : { farm: { ownerId: user.id } };

      const sensors = await prisma.sensor.findMany({
        where: { field: fieldFilter },
        include: {
          field: { select: { name: true } },
          _count: { select: { readings: true, alerts: true } },
        },
      });

      const typeDistribution = sensors.reduce((acc: any, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
      }, {});

      const statusDistribution = sensors.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          totalSensors: sensors.length,
          typeDistribution,
          statusDistribution,
          sensors: sensors.map((s) => ({
            id: s.id,
            deviceCode: s.deviceCode,
            fieldName: s.field.name,
            type: s.type,
            status: s.status,
            isSimulated: s.isSimulated,
            totalReadings: s._count.readings,
            totalAlerts: s._count.alerts,
            lastSeenAt: s.lastSeenAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { type = 'readings', fieldId } = req.query;

      if (type === 'readings') {
        const whereClause: any = {};
        if (fieldId) whereClause.sensor = { fieldId: String(fieldId) };

        const readings = await prisma.sensorReading.findMany({
          where: whereClause,
          include: {
            sensor: {
              select: { deviceCode: true, type: true, unit: true, field: { select: { name: true } } },
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 5000,
        });

        const headers = 'Reading ID,Field,Device Code,Sensor Type,Value,Unit,Quality Status,Source,Recorded At\n';
        const rows = readings
          .map(
            (r) =>
              `"${r.id}","${r.sensor.field.name}","${r.sensor.deviceCode}","${r.sensor.type}",${r.value},"${r.sensor.unit}","${r.qualityStatus}","${r.source}","${r.recordedAt.toISOString()}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="agricloud_sensor_readings_${Date.now()}.csv"`);
        return res.send(headers + rows);
      } else if (type === 'irrigation') {
        const events = await prisma.irrigationEvent.findMany({
          include: {
            field: { select: { name: true } },
          },
          orderBy: { startTime: 'desc' },
          take: 1000,
        });

        const headers = 'Event ID,Field,Mode,Status,Duration (s),Estimated Water (L),Triggered By,Reason,Start Time,End Time\n';
        const rows = events
          .map(
            (e) =>
              `"${e.id}","${e.field.name}","${e.mode}","${e.status}",${e.durationSeconds || 0},${e.estimatedWaterLiters || 0},"${e.triggeredBy || ''}","${(e.reason || '').replace(/"/g, '""')}","${e.startTime.toISOString()}","${e.endTime ? e.endTime.toISOString() : ''}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="agricloud_irrigation_events_${Date.now()}.csv"`);
        return res.send(headers + rows);
      } else {
        // Alerts CSV
        const alerts = await prisma.alert.findMany({
          include: {
            field: { select: { name: true } },
            sensor: { select: { deviceCode: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });

        const headers = 'Alert ID,Field,Device Code,Type,Severity,Status,Message,Created At,Resolved At,Resolved By\n';
        const rows = alerts
          .map(
            (a) =>
              `"${a.id}","${a.field.name}","${a.sensor?.deviceCode || ''}","${a.type}","${a.severity}","${a.status}","${a.message.replace(/"/g, '""')}","${a.createdAt.toISOString()}","${a.resolvedAt ? a.resolvedAt.toISOString() : ''}","${a.resolvedBy || ''}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="agricloud_alerts_${Date.now()}.csv"`);
        return res.send(headers + rows);
      }
    } catch (error) {
      next(error);
    }
  }
}
