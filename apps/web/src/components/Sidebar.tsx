import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trees,
  Sprout,
  Radio,
  Activity,
  Droplets,
  Bell,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from './ui/Badge.js';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, isAdmin, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
    { name: 'Farms', href: '/app/farms', icon: Trees },
    { name: 'Fields & Crops', href: '/app/fields', icon: Sprout },
    { name: 'Sensor Registry', href: '/app/sensors', icon: Radio },
    { name: 'Live Monitoring', href: '/app/live', icon: Activity },
    { name: 'Smart Irrigation', href: '/app/irrigation', icon: Droplets },
    { name: 'Alerts & Diagnostics', href: '/app/alerts', icon: Bell },
    { name: 'Analytics & Reports', href: '/app/analytics', icon: BarChart3 },
    ...(isAdmin ? [{ name: 'Admin Console', href: '/app/admin', icon: ShieldAlert }] : []),
    { name: 'Settings', href: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-white">AgriCloud</span>
          <span className="block text-[10px] tracking-wider text-emerald-400 font-semibold uppercase">
            Smart Precision IoT
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/app'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800/60">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-white truncate">{user?.name}</span>
              <Badge
                variant={user?.role === 'ADMIN' ? 'purple' : user?.role === 'FARMER' ? 'emerald' : 'slate'}
                size="sm"
              >
                {user?.role}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
