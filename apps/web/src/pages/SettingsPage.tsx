import React, { useState } from 'react';
import { User, Shield, Bell, Globe, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/ui/Badge.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [units, setUnits] = useState('metric');
  const [timezone, setTimezone] = useState('UTC');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & Account Preferences</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your notification thresholds, display units, and platform settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">User Identity & Access Tier</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Full Name</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{user?.name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Email Address</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block font-mono">{user?.email}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Role Authorization</span>
              <div className="mt-1">
                <Badge variant={user?.role === 'ADMIN' ? 'purple' : 'emerald'} size="sm">
                  {user?.role}
                </Badge>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Account ID</span>
              <span className="font-mono text-slate-600 text-[11px] mt-1 block truncate">{user?.id}</span>
            </div>
          </div>
        </div>

        {/* Notifications & Dispatch */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Notification Channels</h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">In-App Live Alert Banners</span>
                <span className="text-slate-500 text-[11px]">
                  Display floating notification banners whenever an active alert triggers over WebSocket.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(e) => setCriticalOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">Filter to Critical Severity Only</span>
                <span className="text-slate-500 text-[11px]">
                  Suppress general informational and advisory alerts in real-time broadcasts.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Regional & Units */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Telemetry Unit System & Localization</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Measurement Standards
              </label>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="metric">Metric Standards (°C, mm, Hectares, Liters)</option>
                <option value="imperial">Imperial Standards (°F, in, Acres, Gallons)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Timezone Synchronization
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/Los_Angeles">Pacific Time (US/West)</option>
                <option value="America/New_York">Eastern Time (US/East)</option>
                <option value="Europe/London">London (GMT/BST)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
              ✓ Preferences updated successfully.
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
