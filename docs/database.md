# AgriCloud — Database Design & Entity Relationship

## 1. Overview

The AgriCloud relational database is modeled using Prisma ORM. It provides normalized entities with referential integrity, foreign key cascades, unique hardware device constraints, and optimized time-series composite indexes.

Dual database configurations are supported:
- **Local Development**: Zero-dependency SQLite file (`agricloud.db`).
- **Production / Cloud**: Managed PostgreSQL 16 (AWS RDS, Neon, Supabase, Docker Compose).

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ FARM : owns
    USER ||--o{ REFRESH_TOKEN : generates
    USER ||--o{ AUDIT_LOG : initiates
    USER ||--o{ NOTIFICATION : receives

    FARM ||--o{ FIELD : contains
    CROP ||--o{ FIELD : planted_in

    FIELD ||--o{ SENSOR : deploys
    FIELD ||--o{ IRRIGATION_EVENT : logs
    FIELD ||--o| IRRIGATION_CONTROLLER : connects
    FIELD ||--o| IRRIGATION_SETTINGS : configures
    FIELD ||--o{ ALERT : triggers

    SENSOR ||--o{ SENSOR_READING : records
    SENSOR ||--o{ ALERT : originates

    USER {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        datetime createdAt
    }

    FARM {
        string id PK
        string ownerId FK
        string name
        string location
        float area
        string soilType
        datetime createdAt
    }

    FIELD {
        string id PK
        string farmId FK
        string cropId FK
        string name
        float area
        float moistureThreshold
        boolean irrigationEnabled
    }

    CROP {
        string id PK
        string name
        float optimalMinMoisture
        float optimalMaxMoisture
        float optimalMinTemp
        float optimalMaxTemp
        float optimalMinPh
        float optimalMaxPh
    }

    SENSOR {
        string id PK
        string fieldId FK
        string deviceCode UK
        string type
        string unit
        string status
        datetime lastSeenAt
        boolean isSimulated
    }

    SENSOR_READING {
        string id PK
        string sensorId FK
        float value
        datetime recordedAt
        string source
        string qualityStatus
    }

    IRRIGATION_EVENT {
        string id PK
        string fieldId FK
        datetime startTime
        datetime endTime
        int durationSeconds
        float estimatedWaterLiters
        string mode
        string status
    }

    ALERT {
        string id PK
        string fieldId FK
        string sensorId FK
        string type
        string severity
        string message
        string status
        datetime createdAt
    }
```

## 3. Database Indexes

1. `SensorReading(sensorId, recordedAt)`: Optimizes time-series queries for telemetry line charts.
2. `SensorReading(recordedAt)`: Optimizes historical data retention policies and batch aggregations.
3. `Alert(fieldId, status)`: Optimizes real-time dashboard alert badge lookups.
4. `IrrigationEvent(fieldId, startTime)`: Optimizes water consumption analytics queries.
