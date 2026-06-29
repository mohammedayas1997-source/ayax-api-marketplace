"use client";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Wifi,
  Activity,
} from "lucide-react";

const services = [
  {
    name: "Backend API",
    status: "Operational",
    uptime: "99.98%",
    type: "server",
  },
  {
    name: "PostgreSQL",
    status: "Operational",
    uptime: "99.95%",
    type: "database",
  },
  {
    name: "Redis Queue",
    status: "Operational",
    uptime: "99.90%",
    type: "queue",
  },
  {
    name: "Socket.IO",
    status: "Operational",
    uptime: "99.92%",
    type: "socket",
  },
];

export default function LiveStatusCard() {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Live System Status</h2>

        <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
          <CheckCircle size={14} />
          Healthy
        </span>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.name}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center">
                <ServiceIcon type={service.type} />
              </div>

              <div>
                <h3 className="font-bold">{service.name}</h3>
                <p className="text-sm text-slate-500">
                  Uptime: {service.uptime}
                </p>
              </div>
            </div>

            <StatusBadge status={service.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceIcon({ type }) {
  if (type === "server") return <Server size={20} />;
  if (type === "database") return <Database size={20} />;
  if (type === "socket") return <Wifi size={20} />;
  return <Activity size={20} />;
}

function StatusBadge({ status }) {
  if (status === "Operational") {
    return (
      <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
        <CheckCircle size={14} />
        Operational
      </span>
    );
  }

  if (status === "Warning") {
    return (
      <span className="bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
        <AlertTriangle size={14} />
        Warning
      </span>
    );
  }

  return (
    <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs flex items-center gap-2">
      <XCircle size={14} />
      Down
    </span>
  );
}