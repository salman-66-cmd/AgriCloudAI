# AgriCloud — User Guide & Workflow Walkthrough

## 1. Quick Start Workflow

### Step 1: Authentication
1. Navigate to the login page at `http://localhost:5173/login`.
2. Click **Farmer (Jane)** to auto-fill the demo farmer credentials (`farmer@agricloud.io` / `Password123!`).
3. Click **Sign In to AgriCloud**.

### Step 2: Main Dashboard Exploration
- View average soil moisture across your parcels.
- Inspect real-time air temperature, relative humidity, and active pump count.
- Observe historical telemetry curves on the interactive Recharts line chart.

### Step 3: Managing Farms & Fields
- Open the **Farms** menu to register new agricultural land parcels or update acreage.
- Navigate to **Fields & Crops** to configure crops and customize the automatic moisture threshold (e.g. 35%).

### Step 4: Live Telemetry & Test Ingestion
- Open **Sensor Registry** to inspect all deployed probes.
- Click **Inject Test Reading** on any probe to submit a test value:
  - Entering `< 30.0` on a moisture probe will trigger an automatic low moisture alert.
  - Entering `> 38.0` on a temperature probe will trigger an extreme heat alert.
- Open **Live Monitoring** to see real-time packet streaming over Socket.IO.

### Step 5: Precision Irrigation Actuation
- Navigate to **Smart Irrigation**.
- Review the explainable decision box detailing current soil moisture, rainfall conditions, and pump cooldown status.
- Click **Start Manual Irrigation** to activate the simulated pump.
- Observe live pump status transition to `PUMP RUNNING`.
- Click **Halt Irrigation Pump** to stop the cycle; the system calculates elapsed run seconds and estimated water volume delivered in Liters.

### Step 6: Alerts & Diagnostics
- Open **Alerts & Diagnostics** to inspect active threshold violations.
- Click **Acknowledge** to mark the warning under review.
- Click **Resolve Alert** to input corrective agronomic notes and archive the incident.

### Step 7: Exporting Data Reports
- Navigate to **Analytics & Reports**.
- Click **Export Telemetry CSV** or **Export Irrigation CSV** to download raw dataset records.
- Click **Print Report** for printable PDF generation.
