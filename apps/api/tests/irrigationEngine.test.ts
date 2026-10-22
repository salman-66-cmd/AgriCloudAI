import { describe, it, expect } from 'vitest';
import { IrrigationDecisionEngine, IrrigationEvaluationInput } from '../src/jobs/irrigationEngine.js';

describe('IrrigationDecisionEngine', () => {
  const baseInput: IrrigationEvaluationInput = {
    fieldId: 'field-123',
    autoMode: true,
    minMoistureThreshold: 35.0,
    targetMoistureThreshold: 65.0,
    maxRunDurationSeconds: 600,
    cooldownMinutes: 60,
    suspendOnRain: true,
    rainThresholdMm: 5.0,
    currentMoisture: 30.0,
    moistureRecordedAt: new Date(),
    recentRainfallMm: 0,
    activeEvent: null,
    lastEventEndTime: null,
    staleThresholdMinutes: 30,
  };

  it('triggers START when soil moisture is below threshold and conditions are safe', () => {
    const decision = IrrigationDecisionEngine.evaluate(baseInput);

    expect(decision.action).toBe('START');
    expect(decision.shouldIrrigate).toBe(true);
    expect(decision.reason).toContain('below configured threshold');
  });

  it('returns NONE when soil moisture is above threshold', () => {
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      currentMoisture: 45.0,
    });

    expect(decision.action).toBe('NONE');
    expect(decision.shouldIrrigate).toBe(false);
    expect(decision.reason).toContain('above minimum threshold');
  });

  it('suspends automatic irrigation when recent rainfall is detected', () => {
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      recentRainfallMm: 6.5,
    });

    expect(decision.action).toBe('NONE');
    expect(decision.details.rainSuspended).toBe(true);
    expect(decision.reason).toContain('Recent rainfall detected');
  });

  it('enforces pump cooldown period after a previous cycle', () => {
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      lastEventEndTime: twentyMinsAgo,
      cooldownMinutes: 60,
    });

    expect(decision.action).toBe('NONE');
    expect(decision.details.inCooldown).toBe(true);
    expect(decision.reason).toContain('In pump cooldown period');
  });

  it('refuses to automatically irrigate if sensor data is stale', () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      moistureRecordedAt: twoHoursAgo,
      staleThresholdMinutes: 30,
    });

    expect(decision.action).toBe('NONE');
    expect(decision.details.dataStale).toBe(true);
    expect(decision.reason).toContain('Safety lock: Soil moisture data is stale');
  });

  it('triggers STOP when running irrigation reaches target moisture threshold', () => {
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      currentMoisture: 68.0,
      activeEvent: {
        id: 'event-1',
        startTime: new Date(Date.now() - 300 * 1000),
        mode: 'AUTOMATIC',
      },
    });

    expect(decision.action).toBe('STOP');
    expect(decision.details.targetMoistureReached).toBe(true);
    expect(decision.reason).toContain('Target soil moisture reached');
  });

  it('triggers STOP when running irrigation exceeds max run duration', () => {
    const decision = IrrigationDecisionEngine.evaluate({
      ...baseInput,
      currentMoisture: 50.0,
      activeEvent: {
        id: 'event-1',
        startTime: new Date(Date.now() - 700 * 1000), // ran 700s > 600s
        mode: 'MANUAL',
      },
    });

    expect(decision.action).toBe('STOP');
    expect(decision.details.maxDurationExceeded).toBe(true);
    expect(decision.reason).toContain('Maximum safe runtime');
  });
});
