"use client";

import {
  Server,
  Database,
  Wifi,
  Activity,
  CheckCircle,
  AlertTriangle,
  Cpu,
  HardDrive,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const health = [
  { name: "Backend API Server", status: "Operational", uptime: "99.98%", icon: Server },
  { name: "PostgreSQL Database", status: "Operational", uptime: "99.95%", icon: Database },
  { name: "Redis Queue", status: "Operational", uptime: "99.90%", icon: Activity },
  { name: "Socket.IO Realtime", status: "Operational", uptime: "99.92%", icon: Wifi },
];

const metrics = [
  { title: "CPU Usage", value: "42%", icon: Cpu },
  { title: "Memory Usage", value: "68%", icon: HardDrive },
  { title: "API Latency", value: "120ms", icon: Activity },
  { title: "Error Rate", value: "0.08%", icon: AlertTriangle },
];

export default function SuperSystemHealthPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="System Health" />

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            {metrics.map((item) => (
              <Metric key={item.title} item={item} />
            ))}
          </section>

          <section className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={32} />
              <h2 className="text-2xl font-bold">Overall System Status</h2>
            </div>

            <h3 className="text-5xl font-extrabold">Healthy</h3>

            <p className="text-blue-100 mt-4">
              API server, database, Redis queue, Socket.IO, and core services are operational.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Service Status</h2>

              <button className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2">
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>

            <div className="space-y-5">
              {health.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.name}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                        <Icon size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-slate-500 text-sm">
                          Uptime: {item.uptime}
                        </p>
                      </div>
                    </div>

                    <span className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm flex items-center gap-2 w-fit">
                      <CheckCircle size={16} />
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ item }) {
  const Icon = item.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-5">
        <Icon />
      </div>

      <p className="text-slate-400">{item.title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{item.value}</h2>
    </div>
  );
}