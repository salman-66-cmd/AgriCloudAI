import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Droplets,
  Calendar,
  Layers,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);
  const [irrigationData, setIrrigationData] = useState<any | null>(null);
  const [sensorData, setSensorData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const [ovRes, irrRes, snRes] = await Promise.all([
        api.analytics.overview(),
        api.analytics.irrigation(),
        api.analytics.sensors(),
      ]);
      setOverview(ovRes);
      setIrrigationData(irrRes);
      setSensorData(snRes);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  const modeChartData = irrigationData
    ? [
        { name: 'Automated Mode', value: irrigationData.byMode?.AUTOMATIC || 0 },
        { name: 'Manual Override', value: irrigationData.byMode?.MANUAL || 0 },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Agricultural Analytics & Reports</h1>
            <SimulationBadge label="Virtual Telemetry Estimates" size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Aggregated water consumption, multi-field resource allocation, and persistent CSV exports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <a
            href={api.analytics.exportCsvUrl('readings')}
            download
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Telemetry CSV</span>
          </a>

          <a
            href={api.analytics.exportCsvUrl('irrigation')}
            download
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Irrigation CSV</span>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Holdings</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{overview?.farms.total}</span>
                <span className="text-xs font-semibold text-slate-500">
                  Farms ({overview?.fields.total} Fields)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Deployed Probes</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">{overview?.sensors.total}</span>
                <span className="text-xs font-semibold text-slate-500">
                  Sensors ({overview?.sensors.online} Online)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">24h Water Usage</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-600">
                  {((overview?.irrigation.waterUsed24hLiters || 0) / 1000).toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-500">m³ (~{overview?.irrigation.waterUsed24hLiters.toLocaleString()} L)</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Incident Severity</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{overview?.alerts.active}</span>
                <span className="text-xs font-semibold text-rose-600">
                  ({overview?.alerts.critical} Critical)
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Water Consumption by Field Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Estimated Water Consumption by Field</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Liters delivered across recent irrigation cycles</p>
                </div>
              </div>

              <div className="h-72 w-full">
                {irrigationData?.byField && irrigationData.byField.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={irrigationData.byField} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="fieldName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        formatter={(val: any) => [`${Number(val).toLocaleString()} Liters`, 'Water Delivered']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="totalLiters" fill="#059669" radius={[8, 8, 0, 0]} name="Water (Liters)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    No historical irrigation cycles logged.
                  </div>
                )}
              </div>
            </div>

            {/* Mode Distribution Pie */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Irrigation Mode Breakdown</h2>
                <p className="text-xs text-slate-500 mt-0.5">Automated Rule Engine vs Manual Override</p>

                <div className="h-56 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modeChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={4}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${Number(val).toLocaleString()} L`, 'Water Volume']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-around text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">Automatic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600 font-medium">Manual</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Distribution Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Sensor Fleet Diagnostics Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {sensorData?.typeDistribution &&
                Object.entries(sensorData.typeDistribution).map(([type, count]: [string, any]) => (
                  <div key={type} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="text-xl font-black text-slate-900 block mt-1">{count} Probes</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
