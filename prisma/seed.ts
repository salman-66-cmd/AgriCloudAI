import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AgriCloud database seed...');

  // Clear existing data in reverse order of foreign keys
  await prisma.sensorReading.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.irrigationEvent.deleteMany();
  await prisma.irrigationSettings.deleteMany();
  await prisma.irrigationController.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.field.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.crop.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();

  const demoPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@agricloud.io',
      passwordHash: demoPasswordHash,
      role: 'ADMIN',
    },
  });

  const farmer = await prisma.user.create({
    data: {
      name: 'Jane Farmer',
      email: 'farmer@agricloud.io',
      passwordHash: demoPasswordHash,
      role: 'FARMER',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Alex Observer',
      email: 'viewer@agricloud.io',
      passwordHash: demoPasswordHash,
      role: 'VIEWER',
    },
  });

  console.log(`✅ Users created: ${admin.email}, ${farmer.email}, ${viewer.email}`);

  // 2. Seed Crops
  const corn = await prisma.crop.create({
    data: {
      name: 'Maize / Field Corn',
      variety: 'Golden Hybrid B-73',
      optimalMinMoisture: 40.0,
      optimalMaxMoisture: 70.0,
      optimalMinTemp: 18.0,
      optimalMaxTemp: 32.0,
      optimalMinPh: 5.8,
      optimalMaxPh: 7.0,
      growthDurationDays: 120,
      description: 'High-yield grain corn sensitive to drought during silking stage.',
    },
  });

  const tomato = await prisma.crop.create({
    data: {
      name: 'Processing Tomato',
      variety: 'Roma VF',
      optimalMinMoisture: 45.0,
      optimalMaxMoisture: 75.0,
      optimalMinTemp: 20.0,
      optimalMaxTemp: 29.0,
      optimalMinPh: 6.0,
      optimalMaxPh: 6.8,
      growthDurationDays: 85,
      description: 'Deep-rooting vine tomato requiring consistent root-zone moisture.',
    },
  });

  const wheat = await prisma.crop.create({
    data: {
      name: 'Winter Wheat',
      variety: 'Hard Red Winter',
      optimalMinMoisture: 30.0,
      optimalMaxMoisture: 60.0,
      optimalMinTemp: 12.0,
      optimalMaxTemp: 25.0,
      optimalMinPh: 6.0,
      optimalMaxPh: 7.5,
      growthDurationDays: 240,
      description: 'Drought-tolerant cereal crop grown during cooler months.',
    },
  });

  const soybean = await prisma.crop.create({
    data: {
      name: 'Soybean',
      variety: 'Williams 82',
      optimalMinMoisture: 35.0,
      optimalMaxMoisture: 65.0,
      optimalMinTemp: 20.0,
      optimalMaxTemp: 30.0,
      optimalMinPh: 6.0,
      optimalMaxPh: 7.0,
      growthDurationDays: 110,
      description: 'Nitrogen-fixing legume, critical water demand at pod filling.',
    },
  });

  console.log('✅ Crops created: Corn, Tomato, Wheat, Soybean');

  // 3. Seed Farms
  const farm1 = await prisma.farm.create({
    data: {
      ownerId: farmer.id,
      name: 'Green Valley Organic Farm',
      location: 'Salinas Valley, California, USA',
      area: 45.5,
      soilType: 'Loamy Clay',
      description: 'Primary commercial farm focusing on irrigated maize and vine crops.',
    },
  });

  const farm2 = await prisma.farm.create({
    data: {
      ownerId: farmer.id,
      name: 'Highland Terrace Orchards',
      location: 'Yakima County, Washington, USA',
      area: 28.0,
      soilType: 'Sandy Loam',
      description: 'Benchland parcel equipped with automated precision drip irrigation.',
    },
  });

  console.log('✅ Farms created');

  // 4. Seed Fields
  const field1 = await prisma.field.create({
    data: {
      farmId: farm1.id,
      name: 'North Corn Sector',
      area: 18.0,
      cropId: corn.id,
      moistureThreshold: 38.0,
      irrigationEnabled: true,
    },
  });

  const field2 = await prisma.field.create({
    data: {
      farmId: farm1.id,
      name: 'South Tomato Patch',
      area: 12.5,
      cropId: tomato.id,
      moistureThreshold: 45.0,
      irrigationEnabled: true,
    },
  });

  const field3 = await prisma.field.create({
    data: {
      farmId: farm1.id,
      name: 'East Wheat Ridge',
      area: 15.0,
      cropId: wheat.id,
      moistureThreshold: 30.0,
      irrigationEnabled: false,
    },
  });

  const field4 = await prisma.field.create({
    data: {
      farmId: farm2.id,
      name: 'Terrace Alpha (Soybean)',
      area: 14.0,
      cropId: soybean.id,
      moistureThreshold: 35.0,
      irrigationEnabled: true,
    },
  });

  console.log('✅ Fields created');

  // 5. Seed Irrigation Controllers & Settings
  const fields = [field1, field2, field3, field4];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    await prisma.irrigationController.create({
      data: {
        fieldId: f.id,
        controllerCode: `PUMP-CTRL-${f.name.substring(0, 3).toUpperCase()}-0${i + 1}`,
        status: 'IDLE',
        isSimulated: true,
        lastCommandAt: new Date(Date.now() - 3600000 * 12),
      },
    });

    await prisma.irrigationSettings.create({
      data: {
        fieldId: f.id,
        autoMode: i === 0 || i === 1, // Auto mode enabled for fields 1 & 2
        minMoistureThreshold: f.moistureThreshold,
        targetMoistureThreshold: f.moistureThreshold + 25.0,
        maxRunDurationSeconds: 900, // 15 mins
        cooldownMinutes: 120, // 2 hours
        suspendOnRain: true,
        rainThresholdMm: 4.0,
      },
    });
  }

  // 6. Seed Sensors for each Field
  const sensorsData = [
    // Field 1: North Corn Sector
    { fieldId: field1.id, deviceCode: 'SM-NC-001', type: 'SOIL_MOISTURE', unit: '%', isSimulated: true },
    { fieldId: field1.id, deviceCode: 'TMP-NC-001', type: 'TEMPERATURE', unit: '°C', isSimulated: true },
    { fieldId: field1.id, deviceCode: 'HUM-NC-001', type: 'HUMIDITY', unit: '%', isSimulated: true },
    { fieldId: field1.id, deviceCode: 'RN-NC-001', type: 'RAINFALL', unit: 'mm', isSimulated: true },
    { fieldId: field1.id, deviceCode: 'PH-NC-001', type: 'SOIL_PH', unit: 'pH', isSimulated: true },

    // Field 2: South Tomato Patch
    { fieldId: field2.id, deviceCode: 'SM-ST-002', type: 'SOIL_MOISTURE', unit: '%', isSimulated: true },
    { fieldId: field2.id, deviceCode: 'TMP-ST-002', type: 'TEMPERATURE', unit: '°C', isSimulated: true },
    { fieldId: field2.id, deviceCode: 'HUM-ST-002', type: 'HUMIDITY', unit: '%', isSimulated: true },
    { fieldId: field2.id, deviceCode: 'PH-ST-002', type: 'SOIL_PH', unit: 'pH', isSimulated: true },

    // Field 3: East Wheat Ridge
    { fieldId: field3.id, deviceCode: 'SM-EW-003', type: 'SOIL_MOISTURE', unit: '%', isSimulated: true },
    { fieldId: field3.id, deviceCode: 'TMP-EW-003', type: 'TEMPERATURE', unit: '°C', isSimulated: true },

    // Field 4: Terrace Alpha
    { fieldId: field4.id, deviceCode: 'SM-TA-004', type: 'SOIL_MOISTURE', unit: '%', isSimulated: true },
    { fieldId: field4.id, deviceCode: 'TMP-TA-004', type: 'TEMPERATURE', unit: '°C', isSimulated: true },
    { fieldId: field4.id, deviceCode: 'HUM-TA-004', type: 'HUMIDITY', unit: '%', isSimulated: true },
  ];

  const createdSensors = [];
  for (const s of sensorsData) {
    const sensor = await prisma.sensor.create({
      data: {
        ...s,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });
    createdSensors.push(sensor);
  }

  console.log(`✅ ${createdSensors.length} sensors registered`);

  // 7. Seed Realistic Historical Sensor Readings (Last 48 hours, every 2 hours)
  const now = Date.now();
  const historicalHours = 48;
  const readingsToInsert: any[] = [];

  for (const sensor of createdSensors) {
    let baseMoisture = sensor.deviceCode === 'SM-NC-001' ? 33.5 : 52.0; // Field 1 low moisture to demonstrate alert!
    let basePh = 6.4;

    for (let h = historicalHours; h >= 0; h -= 2) {
      const timestamp = new Date(now - h * 3600 * 1000);
      const hourOfDay = timestamp.getHours();

      // Diurnal cycle: peaks around 14:00 (2pm), coolest at 04:00
      const solarEffect = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
      const tempVal = +(22 + solarEffect * 7 + (Math.random() - 0.5) * 1.2).toFixed(1);
      const humidityVal = +(60 - solarEffect * 20 + (Math.random() - 0.5) * 3).toFixed(1);

      let val = 0;
      if (sensor.type === 'SOIL_MOISTURE') {
        // Natural depletion over time
        val = +(baseMoisture - (historicalHours - h) * 0.15 + (Math.random() - 0.5) * 0.8).toFixed(1);
        val = Math.max(15, Math.min(85, val));
      } else if (sensor.type === 'TEMPERATURE') {
        val = tempVal;
      } else if (sensor.type === 'HUMIDITY') {
        val = Math.max(20, Math.min(95, humidityVal));
      } else if (sensor.type === 'RAINFALL') {
        // Rain event 30 hours ago
        val = h >= 28 && h <= 32 ? +(3.5 + Math.random() * 2).toFixed(1) : 0;
      } else if (sensor.type === 'SOIL_PH') {
        val = +(basePh + Math.sin(h / 10) * 0.15 + (Math.random() - 0.5) * 0.05).toFixed(2);
      }

      readingsToInsert.push({
        sensorId: sensor.id,
        value: val,
        recordedAt: timestamp,
        source: 'SIMULATOR',
        qualityStatus: 'GOOD',
      });
    }
  }

  // Insert readings in batches
  const batchSize = 100;
  for (let i = 0; i < readingsToInsert.length; i += batchSize) {
    await prisma.sensorReading.createMany({
      data: readingsToInsert.slice(i, i + batchSize),
    });
  }

  console.log(`✅ Seeded ${readingsToInsert.length} historical sensor readings`);

  // 8. Seed Irrigation Events
  await prisma.irrigationEvent.create({
    data: {
      fieldId: field1.id,
      startTime: new Date(now - 28 * 3600 * 1000),
      endTime: new Date(now - 28 * 3600 * 1000 + 600 * 1000),
      durationSeconds: 600,
      estimatedWaterLiters: 14500,
      mode: 'AUTOMATIC',
      status: 'COMPLETED',
      triggeredBy: 'Automatic Rule Engine (Moisture < 38%)',
      reason: 'Scheduled automated replenishment',
    },
  });

  await prisma.irrigationEvent.create({
    data: {
      fieldId: field2.id,
      startTime: new Date(now - 14 * 3600 * 1000),
      endTime: new Date(now - 14 * 3600 * 1000 + 480 * 1000),
      durationSeconds: 480,
      estimatedWaterLiters: 9200,
      mode: 'MANUAL',
      status: 'COMPLETED',
      triggeredBy: 'Jane Farmer',
      reason: 'Post-transplant root feeding cycle',
    },
  });

  // 9. Seed Alerts
  const smSensorField1 = createdSensors.find((s) => s.deviceCode === 'SM-NC-001');
  if (smSensorField1) {
    await prisma.alert.create({
      data: {
        fieldId: field1.id,
        sensorId: smSensorField1.id,
        type: 'LOW_MOISTURE',
        severity: 'WARNING',
        message: 'Soil moisture on North Corn Sector is at 33.5%, below safety threshold of 38.0%.',
        status: 'ACTIVE',
        createdAt: new Date(now - 2 * 3600 * 1000),
      },
    });
  }

  const tmpSensorField2 = createdSensors.find((s) => s.deviceCode === 'TMP-ST-002');
  if (tmpSensorField2) {
    await prisma.alert.create({
      data: {
        fieldId: field2.id,
        sensorId: tmpSensorField2.id,
        type: 'HIGH_TEMP',
        severity: 'INFO',
        message: 'Midday ambient temperature reached 31.5°C on South Tomato Patch.',
        status: 'RESOLVED',
        createdAt: new Date(now - 22 * 3600 * 1000),
        acknowledgedAt: new Date(now - 21 * 3600 * 1000),
        acknowledgedBy: 'Jane Farmer',
        resolvedAt: new Date(now - 18 * 3600 * 1000),
        resolvedBy: 'Automatic Engine (Normalized)',
      },
    });
  }

  // 10. Notifications
  await prisma.notification.create({
    data: {
      userId: farmer.id,
      title: 'Moisture Alert: North Corn Sector',
      message: 'Soil moisture is below threshold. Automatic irrigation scheduled if pump is idle.',
      type: 'WARNING',
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: farmer.id,
      title: 'Irrigation Completed',
      message: 'South Tomato Patch manual cycle delivered ~9,200 Liters.',
      type: 'INFO',
      read: true,
    },
  });

  // 11. Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: farmer.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: farmer.id,
      metadata: JSON.stringify({ ip: '127.0.0.1', userAgent: 'Chrome/124.0.0.0' }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: farmer.id,
      action: 'IRRIGATION_START',
      entityType: 'IRRIGATION',
      entityId: field2.id,
      metadata: JSON.stringify({ mode: 'MANUAL', durationSeconds: 480 }),
    },
  });

  // 12. System Settings
  await prisma.systemSetting.create({
    data: {
      key: 'SIMULATION_ENABLED',
      value: 'true',
      description: 'Controls whether the virtual IoT sensor background worker produces readings',
    },
  });

  await prisma.systemSetting.create({
    data: {
      key: 'SIMULATION_INTERVAL_SECONDS',
      value: '10',
      description: 'Interval in seconds between virtual sensor telemetry generation cycles',
    },
  });

  await prisma.systemSetting.create({
    data: {
      key: 'STALE_SENSOR_THRESHOLD_MINUTES',
      value: '30',
      description: 'Minutes without telemetry before a sensor is flagged as OFFLINE',
    },
  });

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
