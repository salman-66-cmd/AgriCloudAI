import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Check,
  CheckSquare,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Alert } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useRealtime } from '../context/RealtimeContext.js';
import { Badge } from '../components/ui/Badge.js';

export const AlertsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { lastAlert } = useRealtime();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Resolve Modal
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchAlerts = async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;

      const res = await api.alerts.list(params);
      setAlerts(res.alerts || []);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  // Real-time update on new alert
  useEffect(() => {
    if (lastAlert) {
      fetchAlerts();
    }
  }, [lastAlert]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.alerts.acknowledge(id);
      fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge alert');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsResolving(true);
    try {
      await api.alerts.resolve(resolvingAlert.id, resolveNote);
      setResolvingAlert(null);
      setResolveNote('');
      fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve alert');
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Alerts & Diagnostics</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time threshold violation logs, environmental warnings, and probe diagnostic telemetry.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ACTIVE', label: 'Active Alerts' },
            { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
            { id: 'RESOLVED', label: 'Resolved History' },
            { id: 'ALL', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">All Field Conditions Normal</h3>
          <p className="text-xs text-slate-500 mt-1">No alerts matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-5 rounded-2xl bg-white border shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                alert.status === 'ACTIVE'
                  ? alert.severity === 'CRITICAL'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-slate-200/80 opacity-90'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-600'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {getSeverityIcon(alert.severity)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{alert.field.name}</span>
                    <span className="text-xs text-slate-400">({alert.field.farm?.name})</span>
                    <Badge variant={alert.severity === 'CRITICAL' ? 'rose' : alert.severity === 'WARNING' ? 'amber' : 'blue'}>
                      {alert.severity}
                    </Badge>
                    <Badge variant={alert.status === 'ACTIVE' ? 'rose' : alert.status === 'ACKNOWLEDGED' ? 'amber' : 'slate'} dot>
                      {alert.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">{alert.message}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                    {alert.acknowledgedBy && <span>• Acknowledged by: {alert.acknowledgedBy}</span>}
                    {alert.resolvedBy && <span>• Resolved by: {alert.resolvedBy}</span>}
                  </div>
                </div>
              </div>

              {canEdit && alert.status !== 'RESOLVED' && (
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setResolvingAlert(alert);
                      setResolveNote('');
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Resolve Alert</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Note Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1">Resolve Active Alert</h2>
            <p className="text-xs text-slate-500 mb-4">{resolvingAlert.message}</p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Resolution Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="e.g. Pump cycle completed, soil moisture replenished above 45%."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isResolving ? 'Resolving...' : 'Confirm Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
