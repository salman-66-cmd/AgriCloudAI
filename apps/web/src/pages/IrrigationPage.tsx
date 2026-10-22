import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Play,
  Square,
  Settings2,
  Clock,
  ShieldAlert,
  CloudRain,
  CheckCircle2,
  Info,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Field, IrrigationEvent } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRealtime } from '../context/RealtimeContext.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';
import { Badge } from '../components/ui/Badge.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';

export const IrrigationPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { lastIrrigation } = useRealtime();

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [fieldData, setFieldData] = useState<any | null>(null);
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    autoMode: false,
    minMoistureThreshold: '35',
    targetMoistureThreshold: '65',
    maxRunDurationSeconds: '600',
    cooldownMinutes: '60',
    suspendOnRain: true,
    rainThresholdMm: '5',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Manual Start / Stop Modal
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startDuration, setStartDuration] = useState('300'); // 5 minutes
  const [isStarting, setIsStarting] = useState(false);

  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const fetchFields = async () => {
    try {
      const farmsRes = await api.farms.list();
      const allFields: Field[] = [];
      for (const farm of farmsRes.farms || []) {
        const fRes = await api.fields.listByFarm(farm.id);
        allFields.push(
          ...(fRes.fields || []).map((f: any) => ({
            ...f,
            farm: { id: farm.id, name: farm.name },
          }))
        );
      }
      setFields(allFields);
      if (allFields.length > 0 && !selectedFieldId) {
        setSelectedFieldId(allFields[0].id);
      }
    } catch (e) {
      console.error('Failed to load fields:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFieldIrrigation = async (fieldId: string) => {
    if (!fieldId) return;
    try {
      const [irrRes, eventsRes] = await Promise.all([
        api.irrigation.getField(fieldId),
        api.irrigation.listEvents({ fieldId, limit: '20' }),
      ]);
      setFieldData(irrRes);
      setEvents(eventsRes.events || []);

      if (irrRes.settings) {
        setSettingsForm({
          autoMode: irrRes.settings.autoMode,
          minMoistureThreshold: irrRes.settings.minMoistureThreshold.toString(),
          targetMoistureThreshold: irrRes.settings.targetMoistureThreshold.toString(),
          maxRunDurationSeconds: irrRes.settings.maxRunDurationSeconds.toString(),
          cooldownMinutes: irrRes.settings.cooldownMinutes.toString(),
          suspendOnRain: irrRes.settings.suspendOnRain,
          rainThresholdMm: irrRes.settings.rainThresholdMm.toString(),
        });
      }
    } catch (e) {
      console.error('Failed to load irrigation data for field:', e);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  useEffect(() => {
    if (selectedFieldId) {
      fetchFieldIrrigation(selectedFieldId);
    }
  }, [selectedFieldId]);

  // Reactive updates on WebSocket irrigation events
  useEffect(() => {
    if (lastIrrigation && selectedFieldId) {
      fetchFieldIrrigation(selectedFieldId);
    }
  }, [lastIrrigation]);

  const handleStartManual = async () => {
    if (!selectedFieldId) return;
    setIsStarting(true);
    try {
      await api.irrigation.start(selectedFieldId, {
        durationSeconds: parseInt(startDuration, 10),
        reason: 'Manual command initiated from Irrigation Control Dashboard',
      });
      setStartModalOpen(false);
      fetchFieldIrrigation(selectedFieldId);
    } catch (err: any) {
      alert(err.message || 'Failed to start irrigation');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopManual = async () => {
    if (!selectedFieldId) return;
    setIsStopping(true);
    try {
      await api.irrigation.stop(selectedFieldId, {
        reason: 'Manual stop initiated by user',
      });
      setStopConfirmOpen(false);
      fetchFieldIrrigation(selectedFieldId);
    } catch (err: any) {
      alert(err.message || 'Failed to stop irrigation');
    } finally {
      setIsStopping(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFieldId) return;
    setIsSavingSettings(true);
    try {
      await api.irrigation.updateSettings(selectedFieldId, settingsForm);
      fetchFieldIrrigation(selectedFieldId);
      alert('Irrigation rules and safety thresholds updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isPumpRunning = fieldData?.activeEvent?.status === 'RUNNING';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Precision Irrigation Actuation</h1>
            <SimulationBadge label="Simulated Pump Actuation" size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explainable rule-based decision engine with automated replenishment and manual pump override.
          </p>
        </div>

        {/* Field Selector */}
        {fields.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500">Field Sector:</span>
            <select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.farm?.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !fieldData ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          Select a cultivated field to inspect pump controls.
        </div>
      ) : (
        <>
          {/* Pump Status & Manual Controls Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isPumpRunning
                      ? 'bg-emerald-100 text-emerald-700 animate-pulse'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Droplets className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{fieldData.fieldName}</h2>
                    <Badge variant={isPumpRunning ? 'emerald' : 'slate'} size="md" dot>
                      {isPumpRunning ? 'PUMP RUNNING' : 'PUMP IDLE'}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Controller: {fieldData.controller?.controllerCode} • Flow Rate: ~22.5 L/sec
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-3">
                  {isPumpRunning ? (
                    <button
                      onClick={() => setStopConfirmOpen(true)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-900/20 transition-all flex items-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Halt Irrigation Pump</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setStartModalOpen(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Manual Irrigation</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Explainable Decision Engine Status Box */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Irrigation Decision Engine Evaluation:
                    </span>
                    <Badge
                      variant={fieldData.decision?.shouldIrrigate ? 'emerald' : 'slate'}
                      size="sm"
                    >
                      {fieldData.decision?.action || 'MONITORING'}
                    </Badge>
                  </div>
                  <p className="text-slate-700 mt-1.5 leading-relaxed font-medium">
                    {fieldData.decision?.reason || 'Awaiting telemetry evaluation...'}
                  </p>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Current Moisture</span>
                      <span className="font-bold text-slate-800">
                        {fieldData.currentMoisture !== null ? `${fieldData.currentMoisture}%` : 'Unavailable'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Target Threshold</span>
                      <span className="font-bold text-slate-800">
                        {fieldData.settings?.targetMoistureThreshold}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Recent Rainfall</span>
                      <span className="font-bold text-slate-800">{fieldData.recentRain} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Automated Rule</span>
                      <span className="font-bold text-slate-800">
                        {fieldData.settings?.autoMode ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configurable Rules and Settings Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Configurable Irrigation Rules & Safety Gates</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <input
                  type="checkbox"
                  id="autoMode"
                  disabled={!canEdit}
                  checked={settingsForm.autoMode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoMode: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="autoMode" className="text-xs cursor-pointer">
                  <span className="font-bold text-slate-900 block">Enable Automated Closed-Loop Mode</span>
                  <span className="text-slate-500 block mt-0.5">
                    When enabled, the backend rule worker will automatically start pumps when soil moisture drops
                    below minimum threshold.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Start Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="80"
                    disabled={!canEdit}
                    value={settingsForm.minMoistureThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, minMoistureThreshold: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Trigger pump when below</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Stop Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="95"
                    disabled={!canEdit}
                    value={settingsForm.targetMoistureThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, targetMoistureThreshold: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Stop pump when reached</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Max Safe Run (Seconds)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="7200"
                    disabled={!canEdit}
                    value={settingsForm.maxRunDurationSeconds}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maxRunDurationSeconds: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default 600s (10 min)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Pump Cooldown (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    disabled={!canEdit}
                    value={settingsForm.cooldownMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, cooldownMinutes: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Rest before next auto cycle</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="suspendRain"
                  disabled={!canEdit}
                  checked={settingsForm.suspendOnRain}
                  onChange={(e) => setSettingsForm({ ...settingsForm, suspendOnRain: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="suspendRain" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold">Postpone watering if rainfall exceeds</span>{' '}
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canEdit}
                    value={settingsForm.rainThresholdMm}
                    onChange={(e) => setSettingsForm({ ...settingsForm, rainThresholdMm: e.target.value })}
                    className="w-16 px-2 py-0.5 border border-slate-300 rounded text-xs mx-1 inline text-center"
                  />{' '}
                  mm in recent hours.
                </label>
              </div>

              {canEdit && (
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Irrigation Preferences'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Historical Irrigation Events Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-bold text-slate-900">Recent Irrigation Cycles & Water Delivery</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Logged persistent events</span>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No past irrigation events recorded for this field.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Estimated Water</th>
                      <th className="py-2.5 px-3">Trigger Reason</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="py-2.5 px-3">
                          <Badge variant={ev.mode === 'AUTOMATIC' ? 'blue' : 'slate'} size="sm">
                            {ev.mode}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              ev.status === 'RUNNING'
                                ? 'emerald'
                                : ev.status === 'COMPLETED'
                                ? 'slate'
                                : 'rose'
                            }
                            size="sm"
                          >
                            {ev.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {ev.durationSeconds ? `${Math.round(ev.durationSeconds / 60)} mins` : '--'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {ev.estimatedWaterLiters ? `${ev.estimatedWaterLiters.toLocaleString()} L` : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={ev.reason || ''}>
                          {ev.reason || '--'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(ev.startTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Manual Start Modal */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Activate Precision Pump on {fieldData?.fieldName}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Confirm manual pump engagement. Note: This triggers the virtual pump simulator.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Run Duration (Seconds)
                </label>
                <select
                  value={startDuration}
                  onChange={(e) => setStartDuration(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="120">2 Minutes (Quick replenishment)</option>
                  <option value="300">5 Minutes (Standard cycle)</option>
                  <option value="600">10 Minutes (Deep root soak)</option>
                  <option value="1200">20 Minutes (High capacity)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStartModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isStarting}
                  onClick={handleStartManual}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  {isStarting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Activate Pump Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Stop Confirmation Dialog */}
      <ConfirmDialog
        isOpen={stopConfirmOpen}
        title="Halt Irrigation Pump"
        message={`Halt active irrigation cycle on ${fieldData?.fieldName}? Current water delivery tally will be calculated and finalized.`}
        confirmLabel="Halt Pump"
        variant="warning"
        isProcessing={isStopping}
        onConfirm={handleStopManual}
        onCancel={() => setStopConfirmOpen(false)}
      />
    </div>
  );
};
