import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Server,
  Activity,
  Cpu,
  Play,
  Square,
  Zap,
  Clock,
  Database,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { SimulationBadge } from '../components/ui/SimulationBadge.js';

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'simulator' | 'logs'>('system');
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [simulatorState, setSimulatorState] = useState<any | null>(null);
  const [simInterval, setSimInterval] = useState('10');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [usersRes, metricsRes, logsRes, simRes] = await Promise.all([
        api.admin.users(),
        api.admin.metrics(),
        api.admin.auditLogs({ limit: '30' }),
        api.admin.simulator(),
      ]);

      setUsers(usersRes.users || []);
      setMetrics(metricsRes);
      setAuditLogs(logsRes.logs || []);
      setSimulatorState(simRes.simulator);
      if (simRes.simulator) {
        setSimInterval(simRes.simulator.intervalSeconds.toString());
      }
    } catch (e) {
      console.error('Failed to load admin console data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    try {
      await api.admin.updateUserRole(targetUserId, newRole);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`Permanently remove user ${targetEmail}?`)) return;
    try {
      await api.admin.deleteUser(targetUserId);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSimulatorControl = async (action: string) => {
    try {
      const res = await api.admin.controlSimulator({
        action,
        intervalSeconds: parseInt(simInterval, 10),
      });
      setSimulatorState(res.simulator);
      alert(`Simulator command "${action}" executed.`);
    } catch (err: any) {
      alert(err.message || 'Simulator control failed');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center max-w-md mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">
          This console requires System Administrator privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Administrator Console</h1>
            <Badge variant="purple" size="sm">
              SUPERUSER ACCESS
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global governance, node cluster telemetry, user authorizations, and IoT simulator controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold">
        {[
          { id: 'system', label: 'System Health & Metrics', icon: Server },
          { id: 'simulator', label: 'IoT Simulator Engine', icon: Cpu },
          { id: 'users', label: 'User & Role Access', icon: Users },
          { id: 'logs', label: 'Security Audit Trail', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: System Health */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Node Process Runtime</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {metrics?.system.uptimeSeconds ? `${Math.round(metrics.system.uptimeSeconds / 60)} mins` : '--'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Version: {metrics?.system.nodeVersion} • {metrics?.system.platform}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Database Latency</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">
                      {metrics?.system.database.responseTimeMs ?? '--'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">ms ping</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-1">Status: HEALTHY</span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Heap Memory Used</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {metrics?.system.memory.heapUsedMb ?? '--'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      / {metrics?.system.memory.heapTotalMb} MB
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    RSS: {metrics?.system.memory.rssMb} MB
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stored Readings</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-purple-600">
                      {metrics?.counts.readings.toLocaleString() ?? '--'}
                    </span>
                    <span className="text-xs font-bold text-slate-500">data points</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">Persistent SQLite / PG tables</span>
                </div>
              </div>

              {/* Architecture & Cloud Details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-3">Cloud Environment Readiness</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 block mb-1">Health & Readiness Endpoints</span>
                    <p className="text-slate-500 mb-2">Kubernetes and container orchestration liveness checks</p>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        GET <code className="text-emerald-600">/health</code> → 200 UP
                      </div>
                      <div>
                        GET <code className="text-emerald-600">/ready</code> → 200 READY (DB Checked)
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 block mb-1">Security & Ingestion Safeguards</span>
                    <p className="text-slate-500 mb-2">Active middlewares on all public and ingest endpoints</p>
                    <ul className="space-y-1 text-slate-600">
                      <li>• In-memory rate limiting (120 req/min on telemetry ingest)</li>
                      <li>• Strict JWT signature verification with refresh token rotation</li>
                      <li>• Role-based access control with resource ownership guards</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Simulator Controls */}
          {activeTab === 'simulator' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Virtual IoT Simulator Background Worker</h3>
                    <SimulationBadge label="Simulation Subsystem" size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Synthesizes physical crop environments, soil drainage curves, temperature cycles, and rainfall.
                  </p>
                </div>

                <Badge variant={simulatorState?.isRunning ? 'emerald' : 'rose'} size="md" dot>
                  {simulatorState?.isRunning ? 'WORKER RUNNING' : 'WORKER PAUSED'}
                </Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Cycle Frequency</span>
                  <span className="font-bold text-slate-800 text-sm">
                    Every {simulatorState?.intervalSeconds} seconds
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Readings Ingested</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {simulatorState?.readingsGeneratedCount} telemetry points
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Last Cycle Executed</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {simulatorState?.lastTickAt
                      ? new Date(simulatorState.lastTickAt).toLocaleTimeString()
                      : 'Never'}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {simulatorState?.isRunning ? (
                  <button
                    onClick={() => handleSimulatorControl('STOP')}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Pause Background Simulation</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSimulatorControl('START')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Background Simulation</span>
                  </button>
                )}

                <button
                  onClick={() => handleSimulatorControl('TICK_NOW')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>Execute Single Cycle Now</span>
                </button>

                <div className="flex items-center gap-2 ml-auto text-xs">
                  <span className="text-slate-600 font-semibold">Interval:</span>
                  <select
                    value={simInterval}
                    onChange={(e) => {
                      setSimInterval(e.target.value);
                      api.admin.controlSimulator({ intervalSeconds: parseInt(e.target.value, 10) });
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none"
                  >
                    <option value="3">3 seconds (Rapid testing)</option>
                    <option value="5">5 seconds</option>
                    <option value="10">10 seconds (Default)</option>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds (Production demo)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: User Management */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Registered Platform Accounts</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Registered Farms</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{u.email}</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.role}
                            disabled={u.id === user?.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="FARMER">FARMER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{u._count?.farms || 0}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Audit Logs */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Security & Operational Audit Trail</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Metadata</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-600">{log.entityType}</td>
                        <td className="py-2.5 px-3 text-emerald-700">{log.user?.name || 'System'}</td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate" title={log.metadata || ''}>
                          {log.metadata || '--'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
