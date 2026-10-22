import { z } from 'zod';

// Roles
export const UserRole = {
  ADMIN: 'ADMIN',
  FARMER: 'FARMER',
  VIEWER: 'VIEWER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Sensor Types
export const SensorType = {
  SOIL_MOISTURE: 'SOIL_MOISTURE',
  TEMPERATURE: 'TEMPERATURE',
  HUMIDITY: 'HUMIDITY',
  RAINFALL: 'RAINFALL',
  SOIL_PH: 'SOIL_PH',
} as const;
export type SensorType = (typeof SensorType)[keyof typeof SensorType];

// Sensor Units
export const SENSOR_UNITS: Record<SensorType, string> = {
  SOIL_MOISTURE: '%',
  TEMPERATURE: '°C',
  HUMIDITY: '%',
  RAINFALL: 'mm',
  SOIL_PH: 'pH',
};

// Sensor Status
export const SensorStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  FAULT: 'FAULT',
} as const;
export type SensorStatus = (typeof SensorStatus)[keyof typeof SensorStatus];

// Alert Severity
export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

// Alert Type
export const AlertType = {
  LOW_MOISTURE: 'LOW_MOISTURE',
  HIGH_TEMP: 'HIGH_TEMP',
  LOW_TEMP: 'LOW_TEMP',
  ABNORMAL_PH: 'ABNORMAL_PH',
  SENSOR_OFFLINE: 'SENSOR_OFFLINE',
  IRRIGATION_ISSUE: 'IRRIGATION_ISSUE',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

// Alert Status
export const AlertStatus = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

// Irrigation Mode
export const IrrigationMode = {
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
} as const;
export type IrrigationMode = (typeof IrrigationMode)[keyof typeof IrrigationMode];

// Irrigation Event Status
export const IrrigationStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  STOPPED_BY_SAFETY: 'STOPPED_BY_SAFETY',
  STOPPED_BY_USER: 'STOPPED_BY_USER',
  FAILED: 'FAILED',
} as const;
export type IrrigationStatus = (typeof IrrigationStatus)[keyof typeof IrrigationStatus];

// Zod Schemas for Validation
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([UserRole.ADMIN, UserRole.FARMER, UserRole.VIEWER]).default(UserRole.FARMER),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const FarmSchema = z.object({
  name: z.string().min(2, 'Farm name is required'),
  location: z.string().min(2, 'Location is required'),
  area: z.number().positive('Area must be a positive number'),
  soilType: z.string().min(2, 'Soil type is required'),
  description: z.string().optional(),
});
export type FarmInput = z.infer<typeof FarmSchema>;

export const FieldSchema = z.object({
  name: z.string().min(2, 'Field name is required'),
  area: z.number().positive('Area must be positive'),
  cropId: z.string().optional().nullable(),
  moistureThreshold: z.number().min(0).max(100).default(35),
  irrigationEnabled: z.boolean().default(true),
});
export type FieldInput = z.infer<typeof FieldSchema>;

export const CropSchema = z.object({
  name: z.string().min(2, 'Crop name is required'),
  variety: z.string().optional(),
  optimalMinMoisture: z.number().min(0).max(100),
  optimalMaxMoisture: z.number().min(0).max(100),
  optimalMinTemp: z.number(),
  optimalMaxTemp: z.number(),
  optimalMinPh: z.number().min(0).max(14),
  optimalMaxPh: z.number().min(0).max(14),
  growthDurationDays: z.number().int().positive().optional(),
  description: z.string().optional(),
});
export type CropInput = z.infer<typeof CropSchema>;

export const SensorRegisterSchema = z.object({
  deviceCode: z.string().min(3, 'Unique device code is required'),
  fieldId: z.string().min(1, 'Field ID is required'),
  type: z.enum([
    SensorType.SOIL_MOISTURE,
    SensorType.TEMPERATURE,
    SensorType.HUMIDITY,
    SensorType.RAINFALL,
    SensorType.SOIL_PH,
  ]),
  unit: z.string().optional(),
  isSimulated: z.boolean().default(true),
});
export type SensorRegisterInput = z.infer<typeof SensorRegisterSchema>;

export const SensorReadingIngestSchema = z.object({
  deviceCode: z.string().min(1, 'Device code is required'),
  value: z.number(),
  recordedAt: z.string().datetime().optional(),
  source: z.string().default('SIMULATOR'),
  qualityStatus: z.string().default('GOOD'),
});
export type SensorReadingIngestInput = z.infer<typeof SensorReadingIngestSchema>;

export const IrrigationSettingsSchema = z.object({
  autoMode: z.boolean().default(false),
  minMoistureThreshold: z.number().min(5).max(80).default(35),
  targetMoistureThreshold: z.number().min(20).max(95).default(65),
  maxRunDurationSeconds: z.number().int().min(60).max(7200).default(600), // max 2 hours
  cooldownMinutes: z.number().int().min(5).max(1440).default(60),
  suspendOnRain: z.boolean().default(true),
  rainThresholdMm: z.number().min(0).default(5),
});
export type IrrigationSettingsInput = z.infer<typeof IrrigationSettingsSchema>;

export const IrrigationStartSchema = z.object({
  durationSeconds: z.number().int().min(30).max(3600).default(300),
  reason: z.string().default('Manual user command'),
});
export type IrrigationStartInput = z.infer<typeof IrrigationStartSchema>;

export const SimulatorConfigSchema = z.object({
  enabled: z.boolean(),
  intervalSeconds: z.number().min(2).max(120),
  rainChance: z.number().min(0).max(1),
  faultChance: z.number().min(0).max(1),
});
export type SimulatorConfigInput = z.infer<typeof SimulatorConfigSchema>;
