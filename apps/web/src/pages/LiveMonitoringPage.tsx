import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Droplets, Thermometer, Wind, CloudRain, Gauge, Cpu, Filter } from 'lucide-react';
import { api } from '../services/api.js';
import { useRealtime } from '../context/RealtimeContext.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';
import { Badge } from '../components/ui/Badge.js';

export const LiveMonitoringPage: React.FC = () => {
  const { isConnected, lastReading } = useRealtime();

  const [fieldsLatest, setFieldsLatest] = useState<any[]>([]);
  const [livePackets, setLivePackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFieldId, setSelectedFieldId] = useState('ALL');

  const fetchLatest = async () => {
    try {
      const res = await api.readings.latest();
      setFieldsLatest(res.fields || []);
    } catch (e) {
      console.error('Failed to load latest readings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    // 5-second polling fallback in case WebSocket drops
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchLatest();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Prepend new incoming packet from WebSocket
  useEffect(() => {
    if (lastReading) {
      setLivePackets((prev) => [lastReading, ...prev.slice(0, 49)]);

      // Update in-memory field cards
      setFieldsLatest((prev) =>
        prev.map((field) => {
          if (field.fieldId === lastReading.fieldId) {
            return {
              ...field,
              sensors: field.sensors.map((s: any) =>
                s.sensorId === lastReading.sensorId
                  ? { ...s, latestValue: lastReading.value, recordedAt: lastReading.recordedAt }
                  : s
              ),
            };
          }
          return field;
        })
      );
    }
  }, [lastReading]);

  const filteredFields =
    selectedFieldId === 'ALL' ? fieldsLatest : fieldsLatest.filter((f) => f.fieldId === selectedFieldId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Environmental Telemetry Stream</h1>
            <SimulationBadge label="Virtual Sensor Simulation" size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time cyber-physical feedback loop streamed directly over Socket.IO WebSockets.
          </p>
        </div>

        {/* Connection status pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>WebSocket Live Stream (Active)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-amber-600" />
                <span>Polling Fallback (5s Interval)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Field Selector */}
      {fieldsLatest.length > 1 && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <span className="text-xs font-bold text-slate-600">Select Cultivated Field:</span>
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="px-3 py-1 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Fields ({fieldsLatest.length} Sectors)</option>
            {fieldsLatest.map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.fieldName} ({f.farmName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Field Live Gauges */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFields.map((field) => (
            <div key={field.fieldId} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{field.fieldName}</h3>
                    <Badge variant="slate" size="sm">
                      {field.crop}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5 block">{field.farmName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Actuator:</span>
                  <Badge variant={field.irrigationStatus === 'RUNNING' ? 'emerald' : 'slate'} size="sm" dot>
                    {field.irrigationStatus === 'RUNNING' ? 'Pump Actuating' : 'Pump Idle'}
                  </Badge>
                </div>
              </div>

              {/* Probe Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
                {field.sensors.map((sensor: any) => (
                  <div
                    key={sensor.sensorId}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        {sensor.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          sensor.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        {sensor.latestValue !== null ? sensor.latestValue : '--'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{sensor.unit}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      Code: {sensor.deviceCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Ingestion Feed Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Live Ingestion Event Feed</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Auto-scrolling realtime telemetry buffer</span>
        </div>

        {livePackets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            Waiting for next telemetry packet from IoT simulator worker...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Device Code</th>
                  <th className="py-2.5 px-3">Sensor Type</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Telemetry Source</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {livePackets.map((pkt, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-emerald-50/50 animate-in fade-in duration-300' : ''}>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{pkt.deviceCode}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{pkt.type}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900">{pkt.value}</span>{' '}
                      <span className="text-slate-400">{pkt.unit}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {pkt.isSimulated ? 'VIRTUAL_SIM' : 'HARDWARE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(pkt.recordedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
