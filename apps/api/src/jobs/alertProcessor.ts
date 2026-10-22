import { prisma } from '../config/prisma.js';
import { broadcastAlert } from '../realtime/socket.js';

export interface AlertEvaluationResult {
  createdAlerts: any[];
  resolvedAlerts: any[];
}

export class AlertProcessor {
  /**
   * Evaluates a newly recorded sensor reading against alert criteria.
   */
  static async evaluateReading(reading: {
    sensorId: string;
    value: number;
    sensor?: {
      type: string;
      fieldId: string;
      field: {
        id: string;
        name: string;
        moistureThreshold: number;
        crop?: {
          name: string;
          optimalMinTemp: number;
          optimalMaxTemp: number;
          optimalMinPh: number;
          optimalMaxPh: number;
        } | null;
      };
    };
  }): Promise<AlertEvaluationResult> {
    const createdAlerts: any[] = [];
    const resolvedAlerts: any[] = [];

    // Fetch sensor details if not provided
    let sensor = reading.sensor;
    if (!sensor) {
      const s = await prisma.sensor.findUnique({
        where: { id: reading.sensorId },
        include: {
          field: {
            include: {
              crop: true,
            },
          },
        },
      });
      if (!s) return { createdAlerts, resolvedAlerts };
      sensor = s as any;
    }

    const field = sensor!.field;
    const value = reading.value;
    const fieldId = field.id;
    const sensorId = reading.sensorId;

    // 1. Soil Moisture check
    if (sensor!.type === 'SOIL_MOISTURE') {
      const threshold = field.moistureThreshold;
      const isCritical = value < threshold * 0.7; // < 70% of threshold
      const isLow = value < threshold;

      if (isLow) {
        // Check if an active alert already exists to prevent duplicate alert spam
        const existing = await prisma.alert.findFirst({
          where: {
            fieldId,
            sensorId,
            type: 'LOW_MOISTURE',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        if (!existing) {
          const alert = await prisma.alert.create({
            data: {
              fieldId,
              sensorId,
              type: 'LOW_MOISTURE',
              severity: isCritical ? 'CRITICAL' : 'WARNING',
              message: `Soil moisture on ${field.name} is ${value.toFixed(1)}%, below the threshold of ${threshold.toFixed(1)}%.`,
              status: 'ACTIVE',
            },
          });
          broadcastAlert(alert, fieldId);
          createdAlerts.push(alert);
        }
      } else {
        // Resolve active low moisture alerts
        const activeAlerts = await prisma.alert.findMany({
          where: {
            fieldId,
            sensorId,
            type: 'LOW_MOISTURE',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        for (const a of activeAlerts) {
          const updated = await prisma.alert.update({
            where: { id: a.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              resolvedBy: 'Automatic Rule Engine (Moisture Restored)',
            },
          });
          broadcastAlert(updated, fieldId);
          resolvedAlerts.push(updated);
        }
      }
    }

    // 2. Temperature check
    if (sensor!.type === 'TEMPERATURE') {
      const minTemp = field.crop?.optimalMinTemp ?? 15.0;
      const maxTemp = field.crop?.optimalMaxTemp ?? 32.0;

      if (value > maxTemp) {
        const isCritical = value > 38.0;
        const existing = await prisma.alert.findFirst({
          where: {
            fieldId,
            sensorId,
            type: 'HIGH_TEMP',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        if (!existing) {
          const alert = await prisma.alert.create({
            data: {
              fieldId,
              sensorId,
              type: 'HIGH_TEMP',
              severity: isCritical ? 'CRITICAL' : 'WARNING',
              message: `High temperature recorded on ${field.name}: ${value.toFixed(1)}°C (optimal max: ${maxTemp}°C).`,
              status: 'ACTIVE',
            },
          });
          broadcastAlert(alert, fieldId);
          createdAlerts.push(alert);
        }
      } else if (value < minTemp) {
        const isCritical = value < 4.0;
        const existing = await prisma.alert.findFirst({
          where: {
            fieldId,
            sensorId,
            type: 'LOW_TEMP',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        if (!existing) {
          const alert = await prisma.alert.create({
            data: {
              fieldId,
              sensorId,
              type: 'LOW_TEMP',
              severity: isCritical ? 'CRITICAL' : 'WARNING',
              message: `Frost / Low temperature hazard on ${field.name}: ${value.toFixed(1)}°C (optimal min: ${minTemp}°C).`,
              status: 'ACTIVE',
            },
          });
          broadcastAlert(alert, fieldId);
          createdAlerts.push(alert);
        }
      } else {
        // Temperature normalized -> resolve high and low temp alerts
        const activeAlerts = await prisma.alert.findMany({
          where: {
            fieldId,
            sensorId,
            type: { in: ['HIGH_TEMP', 'LOW_TEMP'] },
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        for (const a of activeAlerts) {
          const updated = await prisma.alert.update({
            where: { id: a.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              resolvedBy: 'Automatic Rule Engine (Temperature Normalized)',
            },
          });
          broadcastAlert(updated, fieldId);
          resolvedAlerts.push(updated);
        }
      }
    }

    // 3. Soil pH check
    if (sensor!.type === 'SOIL_PH') {
      const minPh = field.crop?.optimalMinPh ?? 5.5;
      const maxPh = field.crop?.optimalMaxPh ?? 7.5;

      if (value < minPh || value > maxPh) {
        const existing = await prisma.alert.findFirst({
          where: {
            fieldId,
            sensorId,
            type: 'ABNORMAL_PH',
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
        });

        if (!existing) {
          const alert = await prisma.alert.create({
            data: {
              fieldId,
              sensorId,
              type: 'ABNORMAL_PH',
              severity: 'WARNING',
              message: `Soil pH (${value.toFixed(2)}) on ${field.name} is outside optimal bounds [${minPh} - ${maxPh}].`,
              status: 'ACTIVE',
            },
          });
          broadcastAlert(alert, fieldId);
          createdAlerts.push(alert);
        }
      }
    }

    return { createdAlerts, resolvedAlerts };
  }

  /**
   * Periodic check for sensors that haven't sent data in staleThresholdMinutes.
   */
  static async checkOfflineSensors(staleThresholdMinutes = 30): Promise<number> {
    const thresholdDate = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);

    const staleSensors = await prisma.sensor.findMany({
      where: {
        status: 'ONLINE',
        OR: [{ lastSeenAt: { lt: thresholdDate } }, { lastSeenAt: null }],
      },
      include: {
        field: true,
      },
    });

    for (const sensor of staleSensors) {
      await prisma.sensor.update({
        where: { id: sensor.id },
        data: { status: 'OFFLINE' },
      });

      const existingAlert = await prisma.alert.findFirst({
        where: {
          sensorId: sensor.id,
          type: 'SENSOR_OFFLINE',
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        },
      });

      if (!existingAlert) {
        const alert = await prisma.alert.create({
          data: {
            fieldId: sensor.fieldId,
            sensorId: sensor.id,
            type: 'SENSOR_OFFLINE',
            severity: 'WARNING',
            message: `Sensor ${sensor.deviceCode} (${sensor.type}) on field ${sensor.field.name} has stopped sending data.`,
            status: 'ACTIVE',
          },
        });
        broadcastAlert(alert, sensor.fieldId);
      }
    }

    return staleSensors.length;
  }
}
