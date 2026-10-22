import React from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Droplets,
  Radio,
  Cpu,
  BarChart3,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Header */}
      <header className="h-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-slate-900">AgriCloud</span>
            <span className="block text-[10px] tracking-widest text-emerald-600 font-bold uppercase">
              Smart Precision Agriculture
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Cloud-Connected Smart Agriculture & Irrigation Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Optimize Crop Yields with <span className="text-emerald-600">Precision IoT Telemetry</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
            Monitor real-time soil moisture, temperature, humidity, rainfall, and pH. Actuate smart irrigation
            automatically using deterministic, explainable agronomic threshold models.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-3.5 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-700/25 transition-all flex items-center gap-2"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 text-base font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl shadow-xs transition-all"
            >
              Swagger REST Docs
            </a>
          </div>

          {/* Demo Credentials Quick Pill */}
          <div className="mt-10 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm max-w-xl mx-auto text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Instant Development Demo Credentials
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700 block">Farmer Account:</span>
                <code className="text-emerald-600 font-mono">farmer@agricloud.io</code>
                <span className="text-slate-400 block text-[11px] mt-0.5">Password: Password123!</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-700 block">Admin Account:</span>
                <code className="text-purple-600 font-mono">admin@agricloud.io</code>
                <span className="text-slate-400 block text-[11px] mt-0.5">Password: Password123!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-white border-y border-slate-200 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Cloud Precision Agriculture
            </h2>
            <p className="text-slate-600 mt-2">
              Built on scalable microservice principles with closed-loop virtual sensor simulation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Sensor Telemetry</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Soil moisture (%), temperature (°C), relative humidity (%), precipitation (mm), and pH. Streamed in
                real-time over Socket.IO and stored in persistent time-series tables.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Explainable Irrigation Rules</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Deterministic decision engine evaluates crop moisture thresholds, rainfall postponement, pump
                cooldowns, and run duration safety limits before actuating simulated pumps.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">IoT Simulator Worker</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                When physical hardware is unavailable, our continuous cyber-physical simulator reproduces diurnal
                temperatures, soil drying rates, rainfall events, and pump water delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cloud Architecture Section */}
      <section className="py-16 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 overflow-hidden relative shadow-2xl">
          <div className="max-w-2xl relative z-10">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Cloud Computing Concepts</span>
            <h2 className="text-3xl font-black mt-2 tracking-tight">Production-Ready Cloud Infrastructure</h2>
            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              Demonstrates containerization with Docker Compose, versioned REST APIs under /api/v1, JWT rotation,
              stateless horizontal API scaling, health checks, Prisma migrations, and managed PostgreSQL support.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dual database support: SQLite local zero-config & PostgreSQL cloud production</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Role-based access control (Admin, Farmer, Viewer) with resource ownership checks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time WebSocket event bus with automatic client reconnection and polling fallback</span>
              </li>
            </ul>

            <div className="mt-8">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors"
              >
                Enter AgriCloud Platform
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>© 2026 AgriCloud System. Cloud-Based Smart Agriculture Monitoring and Irrigation Management System.</p>
        <p className="mt-1 text-slate-400">Academic Project | Fully Functional Production-Style Stack</p>
      </footer>
    </div>
  );
};
