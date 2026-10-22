import { prisma } from '../config/prisma.js';
import { broadcastSensorReading, broadcastIrrigationEvent } from '../realtime/socket.js';
import { AlertProcessor } from './alertProcessor.js';
import { IrrigationDecisionEngine } from './irrigationEngine.js';
import { config } from '../config/env.js';

export interface SimulatorState {
  isRunning: boolean;
  intervalSeconds: number;
  lastTickAt: Date | null;
  readingsGeneratedCount: number;
  faultChance: number;
  rainChance: number;
}

export class IoTSensorSimulator {
  private static instance: IoTSensorSimulator | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private state: SimulatorState = {
    isRunning: false,
    intervalSeconds: config.simulation.intervalSeconds,
    lastTickAt: null,
    readingsGeneratedCount: 0,
    faultChance: config.simulation.faultChance,
    rainChance: config.simulation.rainChance,
  };

  private constructor() {}

  public static getInstance(): IoTSensorSimulator {
    if (!IoTSensorSimulator.instance) {
      IoTSensorSimulator.instance = new IoTSensorSimulator();
    }
    return IoTSensorSimulator.instance;
  }

  public getState(): SimulatorState {
    return { ...this.state };
  }

  public setInterval(seconds: number) {
    this.state.intervalSeconds = Math.max(2, Math.min(120, seconds));
    if (this.state.isRunning) {
      this.stop();
      this.start();
    }
  }

  public start() {
    if (this.state.isRunning) return;
    this.state.isRunning = true;
    console.log(`🌾 IoT Sensor Simulator started (interval: ${this.state.intervalSeconds}s)`);

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('❌ Error during simulator tick:', err);
      });
    }, this.state.intervalSeconds * 1000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    console.log('⏸️ IoT Sensor Simulator stopped');
  }

  /**
   * Single execution cycle of the simulator.
   */
  public async tick() {
    if (this.isProcessing) return; // Prevent overlapping runs
    this.isProcessing = true;

    try {
      this.state.lastTickAt = new Date();
      const now = new Date();
      const hourOfDay = now.getHours() + now.getMinutes() / 60;

      // Solar thermal factor: peak at 14:00 (2pm), lowest at 04:00 (4am)
      const solarFactor = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);

      // Fetch all registered fields with their sensors and active irrigation
      const fields = await prisma.field.findMany({
        include: {
          sensors: {
            where: { isSimulated: true },
          },
          irrigationController: true,
          irrigationSettings: true,
          irrigationEvents: {
            where: { status: 'RUNNING' },
            take: 1,
          },
          crop: true,
        },
      });

      for (const field of fields) {
        const activeIrrigation = field.irrigationEvents[0] || null;
        let fieldCurrentMoisture: number | null = null;
        let fieldRecentRainfall: number = 0;

        // 1. Process simulated sensors for this field
        for (const sensor of field.sensors) {
          // Check for simulated sensor fault
          const isFaulty = Math.random() < this.state.faultChance;
          if (isFaulty) {
            await prisma.sensor.update({
              where: { id: sensor.id },
              data: { status: 'FAULT', lastSeenAt: now },
            });
            continue;
          }

          // Get latest reading to base next continuous step
          const latest = await prisma.sensorReading.findFirst({
            where: { sensorId: sensor.id },
            orderBy: { recordedAt: 'desc' },
          });

          let val = 0;
          let qualityStatus = 'GOOD';

          if (sensor.type === 'SOIL_MOISTURE') {
            const current = latest ? latest.value : 45.0;
            if (activeIrrigation) {
              // Active irrigation increases soil moisture smoothly
              val = +(current + 1.2 + Math.random() * 0.8).toFixed(1);
            } else {
              // Natural soil drying and evapotranspiration
              val = +(current - (0.1 + Math.random() * 0.15)).toFixed(1);
            }
            val = Math.max(10, Math.min(95, val));
            fieldCurrentMoisture = val;
          } else if (sensor.type === 'TEMPERATURE') {
            const baseTemp = 23.0;
            val = +(baseTemp + solarFactor * 8.0 + (Math.random() - 0.5) * 0.6).toFixed(1);
          } else if (sensor.type === 'HUMIDITY') {
            const baseHum = 58.0;
            val = +(baseHum - solarFactor * 22.0 + (Math.random() - 0.5) * 1.5).toFixed(1);
            val = Math.max(15, Math.min(98, val));
          } else if (sensor.type === 'RAINFALL') {
            // Occasional rain shower
            const isRaining = Math.random() < this.state.rainChance;
            val = isRaining ? +(1.5 + Math.random() * 4.0).toFixed(1) : 0;
            fieldRecentRainfall = val;
          } else if (sensor.type === 'SOIL_PH') {
            const current = latest ? latest.value : 6.5;
            val = +(current + (Math.random() - 0.5) * 0.04).toFixed(2);
            val = Math.max(4.0, Math.min(9.0, val));
          }

          // Save reading to database
          const createdReading = await prisma.sensorReading.create({
            data: {
              sensorId: sensor.id,
              value: val,
              recordedAt: now,
              source: 'SIMULATOR',
              qualityStatus,
            },
          });

          // Update sensor last seen
          await prisma.sensor.update({
            where: { id: sensor.id },
            data: { status: 'ONLINE', lastSeenAt: now },
          });

          this.state.readingsGeneratedCount++;

          // Broadcast reading over Socket.IO
          broadcastSensorReading(
            {
              id: createdReading.id,
              sensorId: sensor.id,
              deviceCode: sensor.deviceCode,
              type: sensor.type,
              unit: sensor.unit,
              value: val,
              recordedAt: createdReading.recordedAt,
              fieldId: field.id,
              farmId: field.farmId,
              isSimulated: true,
            },
            field.id,
            field.farmId
          );

          // Evaluate alerts for this reading
          await AlertProcessor.evaluateReading({
            sensorId: sensor.id,
            value: val,
            sensor: {
              type: sensor.type,
              fieldId: field.id,
              field: {
                id: field.id,
                name: field.name,
                moistureThreshold: field.moistureThreshold,
                crop: field.crop,
              },
            },
          });
        }

        // 2. Automated Irrigation Rule Engine Evaluation for this field
        if (field.irrigationSettings && field.irrigationEnabled) {
          const lastCompletedEvent = await prisma.irrigationEvent.findFirst({
            where: { fieldId: field.id, status: { in: ['COMPLETED', 'STOPPED_BY_SAFETY', 'STOPPED_BY_USER'] } },
            orderBy: { startTime: 'desc' },
          });

          const decision = IrrigationDecisionEngine.evaluate({
            fieldId: field.id,
            autoMode: field.irrigationSettings.autoMode,
            minMoistureThreshold: field.irrigationSettings.minMoistureThreshold,
            targetMoistureThreshold: field.irrigationSettings.targetMoistureThreshold,
            maxRunDurationSeconds: field.irrigationSettings.maxRunDurationSeconds,
            cooldownMinutes: field.irrigationSettings.cooldownMinutes,
            suspendOnRain: field.irrigationSettings.suspendOnRain,
            rainThresholdMm: field.irrigationSettings.rainThresholdMm,
            currentMoisture: fieldCurrentMoisture,
            moistureRecordedAt: now,
            recentRainfallMm: fieldRecentRainfall,
            activeEvent: activeIrrigation
              ? {
                  id: activeIrrigation.id,
                  startTime: activeIrrigation.startTime,
                  mode: activeIrrigation.mode,
                }
              : null,
            lastEventEndTime: lastCompletedEvent?.endTime || null,
          });

          if (decision.action === 'START' && !activeIrrigation) {
            // Start automated irrigation
            const newEvent = await prisma.irrigationEvent.create({
              data: {
                fieldId: field.id,
                startTime: now,
                mode: 'AUTOMATIC',
                status: 'RUNNING',
                triggeredBy: 'Automated Rule Engine',
                reason: decision.reason,
              },
            });

            if (field.irrigationController) {
              await prisma.irrigationController.update({
                where: { id: field.irrigationController.id },
                data: { status: 'RUNNING', lastCommandAt: now },
              });
            }

            broadcastIrrigationEvent(newEvent, field.id);
            console.log(`💧 [Auto Irrigation Started] Field: ${field.name} (${decision.reason})`);
          } else if (decision.action === 'STOP' && activeIrrigation) {
            // Stop active irrigation
            const durationSec = Math.round((now.getTime() - new Date(activeIrrigation.startTime).getTime()) / 1000);
            const estWaterLiters = +(durationSec * 22.5).toFixed(0); // ~22.5 L/s pump delivery

            const status = decision.details.maxDurationExceeded ? 'STOPPED_BY_SAFETY' : 'COMPLETED';

            const updatedEvent = await prisma.irrigationEvent.update({
              where: { id: activeIrrigation.id },
              data: {
                endTime: now,
                durationSeconds: durationSec,
                estimatedWaterLiters: estWaterLiters,
                status,
                reason: decision.reason,
              },
            });

            if (field.irrigationController) {
              await prisma.irrigationController.update({
                where: { id: field.irrigationController.id },
                data: { status: 'IDLE', lastCommandAt: now },
              });
            }

            broadcastIrrigationEvent(updatedEvent, field.id);
            console.log(`⏹️ [Auto Irrigation Stopped] Field: ${field.name} (${decision.reason})`);
          }
        }
      }

      // Check for offline sensors periodically (once every 10 ticks)
      if (this.state.readingsGeneratedCount % 10 === 0) {
        await AlertProcessor.checkOfflineSensors(30);
      }
    } catch (error) {
      console.error('❌ Error executing simulator cycle:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
