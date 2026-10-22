import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Thermometer,
  CloudRain,
  Radio,
  AlertTriangle,
  Play,
  CheckCircle,
  RefreshCw,
  Trees,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { OverviewStats, SensorReading, Alert } from '../types/index.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';
import { Badge } from '../components/ui/Badge.js';
import { useRealtime } from '../context/RealtimeContext.js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [historyReadings, setHistoryReadings] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { lastReading, lastAlert, lastIrrigation } = useRealtime();

  const fetchDashboardData = async () => {
    try {
      const [overviewData, historyData, alertsData, farmsData] = await Promise.all([
        api.analytics.overview(),
        api.readings.history({ range: timeRange }),
        api.alerts.list({ status: 'ACTIVE', limit: '5' }),
        api.farms.list(),
      ]);

      setStats(overviewData);
      setHistoryReadings(historyData.readings || []);
      setRecentAlerts(alertsData.alerts || []);
      setFarms(farmsData.farms || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Real-time reactive update when new reading or alert is received via WebSocket
  useEffect(() => {
    if (lastReading) {
      // Re-fetch overview stats periodically or update counters
      setStats((prev) => {
        if (!prev) return prev;
        if (lastReading.type === 'SOIL_MOISTURE') {
          return {
            ...prev,
            currentConditions: {
              ...prev.currentConditions,
              avgSoilMoisture: lastReading.value,
            },
          };
        }
        return prev;
      });
    }
  }, [lastReading]);

  useEffect(() => {
    if (lastAlert) {
      fetchDashboardData();
    }
  }, [lastAlert]);

  useEffect(() => {
    if (lastIrrigation) {
      fetchDashboardData();
    }
  }, [lastIrrigation]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.alerts.acknowledge(alertId);
      setRecentAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  };

  // Format historical chart data
  const chartData = React.useMemo(() => {
    const dataMap: Record<string, any> = {};

    historyReadings.forEach((r) => {
      const timeStr = new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!dataMap[timeStr]) {
        dataMap[timeStr] = { time: timeStr };
      }
      if (r.sensor?.type === 'SOIL_MOISTURE') {
        dataMap[timeStr].moisture = r.value;
      } else if (r.sensor?.type === 'TEMPERATURE') {
        dataMap[timeStr].temperature = r.value;
      } else if (r.sensor?.type === 'HUMIDITY') {
        dataMap[timeStr].humidity = r.value;
      }
    });

    return Object.values(dataMap);
  }, [historyReadings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading precision telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agricultural Command Center</h1>
            <SimulationBadge label="Virtual IoT Simulation" size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time multi-sensor telemetry and automated irrigation status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchDashboardData();
            }}
            disabled={isRefreshing}
            className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-xs"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Time Range Selector */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs font-semibold">
            {['1h', '6h', '24h', '7d'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  timeRange === r ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soil Moisture */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Soil Moisture</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {stats?.currentConditions.avgSoilMoisture ?? '--'}
            </span>
            <span className="text-sm font-semibold text-slate-500">%</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (stats?.currentConditions.avgSoilMoisture ?? 50) < 35
                    ? 'bg-rose-500'
                    : (stats?.currentConditions.avgSoilMoisture ?? 50) < 45
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, stats?.currentConditions.avgSoilMoisture ?? 50)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Optimal: 40-70%</span>
          </div>
        </div>

        {/* Temperature & Humidity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Microclimate</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Thermometer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900">
                {stats?.currentConditions.avgTemperature ?? '--'}
              </span>
              <span className="text-sm font-semibold text-slate-500 ml-1">°C</span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">Air Temp</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-700">
                {stats?.currentConditions.avgHumidity ?? '--'}
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-0.5">%</span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">Humidity</span>
            </div>
          </div>
        </div>

        {/* Irrigation Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Irrigation</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                (stats?.irrigation.activePumps ?? 0) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
              }`}
            >
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.irrigation.activePumps ?? 0}</span>
            <span className="text-xs font-semibold text-slate-500">Pumps Running</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>24h Delivered:</span>
            <span className="font-bold text-slate-800">
              {((stats?.irrigation.waterUsed24hLiters || 0) / 1000).toFixed(1)} m³
            </span>
          </div>
        </div>

        {/* System Diagnostics & Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sensor Network</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-emerald-600">{stats?.sensors.online ?? 0}</span>
              <span className="text-xs font-semibold text-slate-400 ml-1">/ {stats?.sensors.total ?? 0}</span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">Sensors Online</span>
            </div>
            <div className="text-right">
              <span
                className={`text-2xl font-bold ${
                  (stats?.alerts.active ?? 0) > 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {stats?.alerts.active ?? 0}
              </span>
              <span className="block text-[11px] text-slate-400 font-medium mt-0.5">Active Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Environmental Telemetry Trends</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Time-series progression of soil moisture vs ambient temperature
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Soil Moisture (%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Temperature (°C)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="moisture"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  name="Moisture (%)"
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Temp (°C)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No telemetry recorded within selected timeframe.
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts Banner / Table */}
      {recentAlerts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Active Field Warnings & Alerts</h2>
            </div>
            <Link to="/app/alerts" className="text-xs font-bold text-emerald-600 hover:underline">
              View all ({stats?.alerts.active || recentAlerts.length})
            </Link>
          </div>

          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Badge variant={alert.severity === 'CRITICAL' ? 'rose' : 'amber'} size="sm">
                    {alert.severity}
                  </Badge>
                  <div>
                    <span className="font-bold text-xs text-slate-900">{alert.field.name}</span>
                    <p className="text-xs text-slate-700 mt-0.5">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-colors shadow-2xs"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
