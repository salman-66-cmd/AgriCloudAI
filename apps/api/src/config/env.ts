import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || 'file:./agricloud.db',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'agricloud_dev_secret_access_token_default_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'agricloud_dev_secret_refresh_token_default_key',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim()),
  simulation: {
    enabled: process.env.SIMULATION_ENABLED !== 'false',
    intervalSeconds: parseInt(process.env.SIMULATION_INTERVAL_SECONDS || '10', 10),
    faultChance: parseFloat(process.env.SIMULATION_FAULT_CHANCE || '0.02'),
    rainChance: parseFloat(process.env.SIMULATION_RAIN_CHANCE || '0.08'),
  },
  irrigation: {
    maxDurationSeconds: parseInt(process.env.MAX_CONTINUOUS_IRRIGATION_SECONDS || '1800', 10),
    defaultCooldownMinutes: parseInt(process.env.IRRIGATION_COOLDOWN_DEFAULT_MINUTES || '60', 10),
  },
  upload: {
    dir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '5242880', 10),
  },
};
