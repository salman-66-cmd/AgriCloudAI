import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.js';
import { Navbar } from '../components/Navbar.js';
import { useRealtime } from '../context/RealtimeContext.js';
import { AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { activeAlertNotification, dismissNotification } = useRealtime();

  // Determine page title from path
  const titles: Record<string, string> = {
    '/app': 'System Overview Dashboard',
    '/app/farms': 'Farm Management',
    '/app/fields': 'Fields & Crop Configuration',
    '/app/sensors': 'IoT Sensor Network Registry',
    '/app/live': 'Real-Time Telemetry Stream',
    '/app/irrigation': 'Smart Irrigation & Pump Control',
    '/app/alerts': 'System Alerts & Diagnostics',
    '/app/analytics': 'Analytics & Water Consumption Reports',
    '/app/admin': 'Administrator Control Console',
    '/app/settings': 'User & System Preferences',
  };

  const currentTitle = titles[location.pathname] || 'AgriCloud Management';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-50">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setMobileMenuOpen(true)} title={currentTitle} />

        {/* Global Live Alert Banner */}
        {activeAlertNotification && (
          <div className="bg-rose-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 max-w-3xl truncate">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-200" />
              <span className="font-bold uppercase tracking-wider text-[11px] bg-rose-700/80 px-2 py-0.5 rounded">
                {activeAlertNotification.severity}
              </span>
              <span className="truncate">{activeAlertNotification.message}</span>
              <Link
                to="/app/alerts"
                onClick={dismissNotification}
                className="underline font-bold text-rose-100 hover:text-white shrink-0 ml-2"
              >
                Inspect
              </Link>
            </div>
            <button
              onClick={dismissNotification}
              className="p-1 hover:bg-rose-700 rounded-md transition-colors"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
