# AgriCloud — System Architecture Documentation

## 1. Executive Summary

AgriCloud is a cloud-native precision agriculture and smart irrigation management platform. The system ingests environmental telemetry (soil moisture, ambient temperature, relative humidity, precipitation, and soil pH), analyzes values against crop-specific agronomic models, evaluates deterministic irrigation rules, and orchestrates simulated precision pumps.

## 2. Multi-Tier System Topology

```mermaid
graph TD
    subgraph Client Layer [Frontend Presentation Layer]
        A[React 18 + Vite SPA]
        B[Tailwind CSS + Lucide UI]
        C[Socket.IO Client]
        D[TanStack Query State]
    end

    subgraph Gateway Layer [Edge & Ingestion Layer]
        E[Nginx Reverse Proxy / Port 80]
        F[Express API Gateway / Port 5000]
        G[JWT Auth & RBAC Guard]
        H[In-Memory Rate Limiter]
    end

    subgraph Processing Layer [Business Logic & Workers]
        I[REST API Controllers /api/v1]
        J[IoT Sensor Simulator Worker]
        K[Irrigation Decision Engine]
        L[Alert Diagnostic Processor]
        M[Socket.IO Realtime Hub]
    end

    subgraph Persistence Layer [Cloud Data Storage]
        N[(PostgreSQL 16 / SQLite)]
        O[Prisma ORM Client]
        P[Time-Series Index Partitioning]
    end

    A <-->|HTTP REST Requests| E
    C <-->|WebSocket Events| E
    E --> F
    F --> G
    G --> H
    H --> I
    I <--> O
    J -->|Simulated Telemetry| O
    J -->|Broadcast| M
    M -->|Push Reading/Alert| C
    J -->|Evaluate Rules| K
    K -->|Actuate Pump| O
    J -->|Check Thresholds| L
    L -->|Trigger Alert| O
    L -->|Broadcast Alert| M
    O <--> N
```

## 3. Cyber-Physical IoT Simulation Feedback Loop

When physical ESP32/Arduino microcontroller probes are offline or during academic evaluation, the system executes an autonomous background simulation worker:

```mermaid
sequenceDiagram
    autonumber
    participant Sim as IoTSensorSimulator
    participant DB as Persistent Database
    participant Engine as IrrigationDecisionEngine
    participant Alerts as AlertProcessor
    participant WS as Socket.IO Hub
    participant UI as Farmer Web Client

    loop Every 10 Seconds
        Sim->>Sim: Compute solar diurnal temperature & soil moisture depletion
        Sim->>DB: Persist SensorReading (Source: SIMULATOR)
        Sim->>WS: Broadcast 'sensor:reading'
        WS->>UI: Real-time UI Gauge Update
        Sim->>Alerts: Evaluate Reading against crop optimal thresholds
        alt Threshold Violated
            Alerts->>DB: Store Alert (Status: ACTIVE)
            Alerts->>WS: Emit 'alert:event'
            WS->>UI: Show Alert Banner & Toast
        end
        Sim->>Engine: Evaluate Field Moisture & Weather State
        alt Moisture < Threshold AND Cooldown Elapsed AND No Rain
            Engine->>DB: Create IrrigationEvent (Status: RUNNING)
            Engine->>WS: Emit 'irrigation:status'
            WS->>UI: Actuate Pump Indicator
        else Target Moisture Reached OR Max Duration Exceeded
            Engine->>DB: Close IrrigationEvent (Status: COMPLETED)
            Engine->>WS: Emit 'irrigation:status'
        end
    end
```

## 4. Cloud Computing Principles Demonstrated

1. **Horizontal Scalability**: Stateless Express.js API design allowing multiple container instances behind a load balancer.
2. **Persistence Isolation**: Relational database (PostgreSQL/SQLite) isolated from application compute memory.
3. **Decoupled Asynchronous Workers**: IoT simulation and threshold evaluation run as autonomous workers without blocking client HTTP request lifecycles.
4. **Environment-Driven Configuration**: 12-factor configuration using environment variables for port, secrets, and connection strings.
5. **Observability & Health Probes**: Dedicated `/health` (liveness) and `/ready` (readiness checking database ping) endpoints.
