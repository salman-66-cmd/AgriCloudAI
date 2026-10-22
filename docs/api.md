# AgriCloud — REST API Reference Documentation

All endpoints are versioned under `/api/v1` and accessible via Swagger UI at `/api-docs`.

## 1. Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | Public |
| `POST` | `/auth/login` | Login with email and password | Public |
| `POST` | `/auth/refresh` | Rotate access token | Public |
| `POST` | `/auth/logout` | Revoke session refresh token | Public |
| `GET` | `/auth/me` | Current authenticated user profile | Bearer JWT |

## 2. Farm & Field Management

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/farms` | List authorized farms | All |
| `POST` | `/farms` | Create a new farm parcel | Admin, Farmer |
| `GET` | `/farms/:id` | Get farm details | All (Owner/Admin) |
| `PATCH` | `/farms/:id` | Update farm metadata | Admin, Farmer |
| `DELETE` | `/farms/:id` | Delete farm & cascades | Admin, Farmer |
| `GET` | `/farms/:farmId/fields` | List fields within a farm | All |
| `POST` | `/farms/:farmId/fields` | Create a field sector | Admin, Farmer |
| `GET` | `/fields/:id` | Field telemetry & controllers | All |
| `PATCH` | `/fields/:id` | Update field threshold | Admin, Farmer |
| `DELETE` | `/fields/:id` | Delete field | Admin, Farmer |

## 3. Sensors & Telemetry Ingestion

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sensors` | List deployed probes with filters |
| `POST` | `/sensors` | Register new sensor probe |
| `GET` | `/sensors/:id` | Probe details & history |
| `POST` | `/sensors/:id/readings` | Ingest reading directly |
| `POST` | `/readings/ingest` | Hardware ESP32 ingestion by deviceCode |
| `GET` | `/readings/latest` | Latest telemetry across fields |
| `GET` | `/readings/history` | Historical time-series query |

## 4. Smart Irrigation Actuation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/fields/:fieldId/irrigation` | Current pump state & rules |
| `POST` | `/fields/:fieldId/irrigation/start` | Manual pump actuation |
| `POST` | `/fields/:fieldId/irrigation/stop` | Manual pump shutdown |
| `PATCH` | `/fields/:fieldId/irrigation/settings` | Update thresholds & cooldown |
| `GET` | `/irrigation/events` | Historical irrigation logs |

## 5. Alerts & Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/alerts` | Query active or historical alerts |
| `PATCH` | `/alerts/:id/acknowledge` | Acknowledge active alert |
| `PATCH` | `/alerts/:id/resolve` | Resolve alert with notes |
| `GET` | `/analytics/overview` | Platform-wide KPI counters |
| `GET` | `/analytics/irrigation` | Water consumption breakdown |
| `GET` | `/analytics/sensors` | Probe health & distribution |
| `GET` | `/analytics/export/csv` | Stream CSV dataset |
