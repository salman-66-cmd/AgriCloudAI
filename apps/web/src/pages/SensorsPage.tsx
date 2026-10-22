import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Droplets,
  Thermometer,
  CloudRain,
  Gauge,
  Wind,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Trash2,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Sensor, Field } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';

export const SensorsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Register Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    fieldId: '',
    deviceCode: '',
    type: 'SOIL_MOISTURE',
    isSimulated: true,
  });

  // Telemetry Injection Modal
  const [injectSensor, setInjectSensor] = useState<Sensor | null>(null);
  const [injectValue, setInjectValue] = useState<string>('30.0');
  const [isInjecting, setIsInjecting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Sensor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSensors = async () => {
    try {
      const [sensorsRes, farmsRes] = await Promise.all([api.sensors.list(), api.farms.list()]);
      setSensors(sensorsRes.sensors || []);

      const allFields: Field[] = [];
      for (const farm of farmsRes.farms || []) {
        const fieldRes = await api.fields.listByFarm(farm.id);
        allFields.push(...(fieldRes.fields || []));
      }
      setFields(allFields);
    } catch (e) {
      console.error('Failed to load sensors:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.sensors.register(registerData);
      setIsRegisterOpen(false);
      fetchSensors();
    } catch (err: any) {
      alert(err.message || 'Failed to register sensor');
    }
  };

  const handleInjectTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectSensor) return;
    setIsInjecting(true);
    try {
      await api.sensors.ingest(injectSensor.id, {
        value: parseFloat(injectValue),
        source: 'MANUAL_TEST_INJECT',
      });
      setInjectSensor(null);
      fetchSensors();
    } catch (err: any) {
      alert(err.message || 'Failed to inject telemetry');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.sensors.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchSensors();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sensor');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSensors = sensors.filter((s) => {
    if (typeFilter !== 'ALL' && s.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'SOIL_MOISTURE':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'TEMPERATURE':
        return <Thermometer className="w-5 h-5 text-amber-600" />;
      case 'HUMIDITY':
        return <Wind className="w-5 h-5 text-cyan-600" />;
      case 'RAINFALL':
        return <CloudRain className="w-5 h-5 text-indigo-600" />;
      case 'SOIL_PH':
        return <Gauge className="w-5 h-5 text-purple-600" />;
      default:
        return <Radio className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">IoT Sensor Network Registry</h1>
            <SimulationBadge label="Virtual Sensor Simulation" size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track environmental probe health, live measurements, and inject test telemetry.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setRegisterData({
                fieldId: fields[0]?.id || '',
                deviceCode: `SM-${Date.now().toString(36).substring(4).toUpperCase()}`,
                type: 'SOIL_MOISTURE',
                isSimulated: true,
              });
              setIsRegisterOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register Sensor</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Filters:</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
        >
          <option value="ALL">All Types</option>
          <option value="SOIL_MOISTURE">Soil Moisture (%)</option>
          <option value="TEMPERATURE">Temperature (°C)</option>
          <option value="HUMIDITY">Humidity (%)</option>
          <option value="RAINFALL">Rainfall (mm)</option>
          <option value="SOIL_PH">Soil pH</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="FAULT">Fault / Error</option>
        </select>

        <span className="text-xs text-slate-400 ml-auto font-medium">
          Showing {filteredSensors.length} of {sensors.length} probes
        </span>
      </div>

      {/* Sensor Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSensors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No sensors match your filter</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSensors.map((sensor) => {
            const latestReading = sensor.readings?.[0];
            return (
              <div
                key={sensor.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {getSensorIcon(sensor.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{sensor.deviceCode}</span>
                          {sensor.isSimulated && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              SIM
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {sensor.field?.farm?.name} • {sensor.field?.name}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={
                        sensor.status === 'ONLINE'
                          ? 'emerald'
                          : sensor.status === 'OFFLINE'
                          ? 'slate'
                          : 'rose'
                      }
                      size="sm"
                      dot
                    >
                      {sensor.status}
                    </Badge>
                  </div>

                  {/* Latest Telemetry Display */}
                  <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Latest Telemetry
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-slate-900">
                          {latestReading ? latestReading.value : '--'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{sensor.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Last Seen</span>
                      <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                        {sensor.lastSeenAt
                          ? new Date(sensor.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setInjectSensor(sensor);
                        setInjectValue(latestReading ? latestReading.value.toString() : '30.0');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Inject Test Reading</span>
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => setDeleteTarget(sensor)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                      title="Delete sensor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Register New Sensor Probe</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign to Cultivated Field
                </label>
                <select
                  required
                  value={registerData.fieldId}
                  onChange={(e) => setRegisterData({ ...registerData, fieldId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unique Hardware / Virtual Device Code
                </label>
                <input
                  type="text"
                  required
                  value={registerData.deviceCode}
                  onChange={(e) => setRegisterData({ ...registerData, deviceCode: e.target.value })}
                  placeholder="SM-NC-005"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Measurement Telemetry Type
                </label>
                <select
                  value={registerData.type}
                  onChange={(e) => setRegisterData({ ...registerData, type: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="SOIL_MOISTURE">Soil Moisture (%)</option>
                  <option value="TEMPERATURE">Ambient Temperature (°C)</option>
                  <option value="HUMIDITY">Relative Humidity (%)</option>
                  <option value="RAINFALL">Rainfall Precipitation (mm)</option>
                  <option value="SOIL_PH">Soil pH Scale</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="simulatedCheck"
                  checked={registerData.isSimulated}
                  onChange={(e) => setRegisterData({ ...registerData, isSimulated: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="simulatedCheck" className="text-xs font-semibold text-slate-700">
                  Virtual Sensor (Telemetry generated by background simulator worker)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Register Sensor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telemetry Injection Modal */}
      {injectSensor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Inject Test Telemetry: {injectSensor.deviceCode}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Directly dispatch a custom reading to test the Alert Engine or Irrigation Decision Engine.
            </p>

            <form onSubmit={handleInjectTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reading Value ({injectSensor.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={injectValue}
                  onChange={(e) => setInjectValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-lg font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tip: Ingesting &lt; 35% on a moisture probe triggers an immediate automatic alert.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setInjectSensor(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInjecting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  {isInjecting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Transmit Reading</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Sensor"
        message={`Delete sensor probe "${deleteTarget?.deviceCode}"? Telemetry records associated with this probe will also be removed.`}
        confirmLabel="Delete Sensor"
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
