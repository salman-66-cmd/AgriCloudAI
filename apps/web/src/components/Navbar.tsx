import React from 'react';
import { Menu, Bell, Wifi, WifiOff, FileText, Cpu } from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext.js';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, title = 'AgriCloud Management' }) => {
  const { isConnected, activeAlertNotification, dismissNotification } = useRealtime();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-time WebSocket Status */}
        <div
          title={isConnected ? 'WebSocket Gateway connected (Real-time telemetry)' : 'WebSocket disconnected (Falling back to periodic sync)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live Stream</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Polling Sync</span>
            </>
          )}
        </div>

        {/* Simulation Indicator */}
        <div
          title="Virtual IoT simulation worker active"
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>Sim Worker Active</span>
        </div>

        {/* Swagger Docs Link */}
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          title="View OpenAPI / Swagger Documentation"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Swagger API</span>
        </a>

        {/* Alerts Bell */}
        <Link
          to="/app/alerts"
          title="View Active Alerts"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl relative transition-colors"
        >
          <Bell className="w-5 h-5" />
          {activeAlertNotification && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping" />
          )}
        </Link>
      </div>
    </header>
  );
};
