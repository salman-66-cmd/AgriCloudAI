export interface IrrigationEvaluationInput {
  fieldId: string;
  autoMode: boolean;
  minMoistureThreshold: number;
  targetMoistureThreshold: number;
  maxRunDurationSeconds: number;
  cooldownMinutes: number;
  suspendOnRain: boolean;
  rainThresholdMm: number;
  currentMoisture?: number | null;
  moistureRecordedAt?: Date | null;
  recentRainfallMm?: number | null;
  activeEvent?: {
    id: string;
    startTime: Date;
    mode: string;
  } | null;
  lastEventEndTime?: Date | null;
  staleThresholdMinutes?: number;
}

export interface IrrigationDecision {
  action: 'START' | 'STOP' | 'NONE';
  shouldIrrigate: boolean;
  reason: string;
  details: {
    moistureOk: boolean;
    rainSuspended: boolean;
    inCooldown: boolean;
    dataStale: boolean;
    maxDurationExceeded: boolean;
    targetMoistureReached: boolean;
  };
}

export class IrrigationDecisionEngine {
  /**
   * Evaluates current field state and returns a deterministic, explainable irrigation decision.
   */
  static evaluate(input: IrrigationEvaluationInput, now = new Date()): IrrigationDecision {
    const {
      autoMode,
      minMoistureThreshold,
      targetMoistureThreshold,
      maxRunDurationSeconds,
      cooldownMinutes,
      suspendOnRain,
      rainThresholdMm,
      currentMoisture,
      moistureRecordedAt,
      recentRainfallMm = 0,
      activeEvent,
      lastEventEndTime,
      staleThresholdMinutes = 30,
    } = input;

    // Check 1: If an irrigation event is currently active, check if we need to stop it
    if (activeEvent) {
      const runDurationSeconds = (now.getTime() - new Date(activeEvent.startTime).getTime()) / 1000;
      const maxDurationExceeded = runDurationSeconds >= maxRunDurationSeconds;
      const targetMoistureReached =
        currentMoisture !== null && currentMoisture !== undefined && currentMoisture >= targetMoistureThreshold;

      if (maxDurationExceeded) {
        return {
          action: 'STOP',
          shouldIrrigate: false,
          reason: `Maximum safe runtime of ${Math.round(maxRunDurationSeconds / 60)} minutes exceeded (ran ${Math.round(runDurationSeconds / 60)} mins).`,
          details: {
            moistureOk: true,
            rainSuspended: false,
            inCooldown: false,
            dataStale: false,
            maxDurationExceeded: true,
            targetMoistureReached,
          },
        };
      }

      if (targetMoistureReached) {
        return {
          action: 'STOP',
          shouldIrrigate: false,
          reason: `Target soil moisture reached (${currentMoisture}% >= ${targetMoistureThreshold}%). Pump stopping.`,
          details: {
            moistureOk: true,
            rainSuspended: false,
            inCooldown: false,
            dataStale: false,
            maxDurationExceeded: false,
            targetMoistureReached: true,
          },
        };
      }

      return {
        action: 'NONE',
        shouldIrrigate: true,
        reason: `Irrigation in progress (${Math.round(runDurationSeconds)}s elapsed, current moisture: ${currentMoisture ?? 'unknown'}%).`,
        details: {
          moistureOk: false,
          rainSuspended: false,
          inCooldown: false,
          dataStale: false,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    // Check 2: If automatic mode is disabled, do not start automatically
    if (!autoMode) {
      return {
        action: 'NONE',
        shouldIrrigate: false,
        reason: 'Automatic irrigation mode is disabled for this field.',
        details: {
          moistureOk: true,
          rainSuspended: false,
          inCooldown: false,
          dataStale: false,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    // Check 3: Missing or stale telemetry check
    if (currentMoisture === null || currentMoisture === undefined || !moistureRecordedAt) {
      return {
        action: 'NONE',
        shouldIrrigate: false,
        reason: 'Safety lock: No valid soil moisture readings available.',
        details: {
          moistureOk: false,
          rainSuspended: false,
          inCooldown: false,
          dataStale: true,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    const dataAgeMinutes = (now.getTime() - new Date(moistureRecordedAt).getTime()) / (1000 * 60);
    if (dataAgeMinutes > staleThresholdMinutes) {
      return {
        action: 'NONE',
        shouldIrrigate: false,
        reason: `Safety lock: Soil moisture data is stale (${Math.round(dataAgeMinutes)} minutes old). Cannot reliably trigger auto-irrigation.`,
        details: {
          moistureOk: false,
          rainSuspended: false,
          inCooldown: false,
          dataStale: true,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    // Check 4: Moisture threshold
    const moistureLow = currentMoisture < minMoistureThreshold;
    if (!moistureLow) {
      return {
        action: 'NONE',
        shouldIrrigate: false,
        reason: `Soil moisture (${currentMoisture}%) is above minimum threshold (${minMoistureThreshold}%). No watering required.`,
        details: {
          moistureOk: true,
          rainSuspended: false,
          inCooldown: false,
          dataStale: false,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    // Check 5: Rainfall suspension
    if (suspendOnRain && recentRainfallMm && recentRainfallMm >= rainThresholdMm) {
      return {
        action: 'NONE',
        shouldIrrigate: false,
        reason: `Irrigation postponed: Recent rainfall detected (${recentRainfallMm}mm >= ${rainThresholdMm}mm threshold).`,
        details: {
          moistureOk: false,
          rainSuspended: true,
          inCooldown: false,
          dataStale: false,
          maxDurationExceeded: false,
          targetMoistureReached: false,
        },
      };
    }

    // Check 6: Cooldown period
    if (lastEventEndTime) {
      const minutesSinceLastRun = (now.getTime() - new Date(lastEventEndTime).getTime()) / (1000 * 60);
      if (minutesSinceLastRun < cooldownMinutes) {
        return {
          action: 'NONE',
          shouldIrrigate: false,
          reason: `In pump cooldown period (${Math.round(cooldownMinutes - minutesSinceLastRun)} minutes remaining of ${cooldownMinutes}m cooldown).`,
          details: {
            moistureOk: false,
            rainSuspended: false,
            inCooldown: true,
            dataStale: false,
            maxDurationExceeded: false,
            targetMoistureReached: false,
          },
        };
      }
    }

    // All conditions pass -> trigger automated start
    return {
      action: 'START',
      shouldIrrigate: true,
      reason: `Soil moisture (${currentMoisture}%) is below configured threshold (${minMoistureThreshold}%). Starting automatic replenishment.`,
      details: {
        moistureOk: false,
        rainSuspended: false,
        inCooldown: false,
        dataStale: false,
        maxDurationExceeded: false,
        targetMoistureReached: false,
      },
    };
  }
}
