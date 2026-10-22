export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FARMER' | 'VIEWER';
  createdAt: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  area: number;
  soilType: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  fields?: Field[];
  owner?: { id: string; name: string; email: string };
}

export interface Crop {
  id: string;
  name: string;
  variety?: string | null;
  optimalMinMoisture: number;
  optimalMaxMoisture: number;
  optimalMinTemp: number;
  optimalMaxTemp: number;
  optimalMinPh: number;
  optimalMaxPh: number;
  growthDurationDays?: number | null;
  description?: string | null;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  area: number;
  cropId?: string | null;
  crop?: Crop | null;
  farm?: Farm;
  moistureThreshold: number;
  irrigationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  sensors?: Sensor[];
  irrigationController?: IrrigationController | null;
  irrigationSettings?: IrrigationSettings | null;
  _count?: { alerts: number };
}

export interface Sensor {
  id: string;
  fieldId: string;
  deviceCode: string;
  type: 'SOIL_MOISTURE' | 'TEMPERATURE' | 'HUMIDITY' | 'RAINFALL' | 'SOIL_PH';
  unit: string;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
  lastSeenAt?: string | null;
  isSimulated: boolean;
  createdAt: string;
  readings?: SensorReading[];
  field?: {
    id: string;
    name: string;
    farm?: { id: string; name: string };
    crop?: Crop | null;
  };
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  recordedAt: string;
  source: string;
  qualityStatus: string;
  sensor?: Sensor;
}

export interface IrrigationController {
  id: string;
  fieldId: string;
  controllerCode: string;
  status: 'IDLE' | 'RUNNING' | 'FAULT';
  isSimulated: boolean;
  lastCommandAt?: string | null;
}

export interface IrrigationSettings {
  id: string;
  fieldId: string;
  autoMode: boolean;
  minMoistureThreshold: number;
  targetMoistureThreshold: number;
  maxRunDurationSeconds: number;
  cooldownMinutes: number;
  suspendOnRain: boolean;
  rainThresholdMm: number;
}

export interface IrrigationEvent {
  id: string;
  fieldId: string;
  field?: { id: string; name: string; farm?: { id: string; name: string } };
  startTime: string;
  endTime?: string | null;
  durationSeconds?: number | null;
  estimatedWaterLiters?: number | null;
  mode: 'MANUAL' | 'AUTOMATIC';
  status: 'RUNNING' | 'COMPLETED' | 'STOPPED_BY_SAFETY' | 'STOPPED_BY_USER' | 'FAILED';
  triggeredBy?: string | null;
  reason?: string | null;
}

export interface Alert {
  id: string;
  fieldId: string;
  sensorId?: string | null;
  field: { id: string; name: string; farm?: { id: string; name: string } };
  sensor?: { id: string; deviceCode: string; type: string; unit: string } | null;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface OverviewStats {
  farms: { total: number };
  fields: { total: number };
  crops: { total: number };
  sensors: {
    total: number;
    online: number;
    offline: number;
    fault: number;
  };
  currentConditions: {
    avgSoilMoisture: number;
    avgTemperature: number;
    avgHumidity: number;
  };
  irrigation: {
    activePumps: number;
    waterUsed24hLiters: number;
    eventsCount24h: number;
  };
  alerts: {
    active: number;
    critical: number;
  };
}
