import {
  Server,
  Database,
  Wifi,
  Activity,
  CheckCircle,
  AlertTriangle,
  Cpu,
  HardDrive,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

const health = [
  {
    name: "Backend API Server",
    status: "Operational",
    icon: <Server />,
    uptime: "99.98%",
  },
  {
    name: "PostgreSQL Database",
    status: "Operational",
    icon: <Database />,
    uptime: "99.95%",
  },
  {
    name: "Redis Queue",
    status: "Operational",
    icon: <Activity />,
    uptime: "99.90%",
  },
  {
    name: "Socket.IO Realtime",
    status: "Operational",
    icon: <Wifi />,
    uptime: "99.92%",
  },
];

const metrics = [
  { title: "CPU Usage", value: "42%", icon: <Cpu /> },
  { title: "Memory Usage", value: "68%", icon: <HardDrive /> },
  { title: "API Latency", value: "120ms", icon: <Activity /> },
  { title: "Error Rate", value: "0.08%", icon: <AlertTriangle /> },
];

export default function AdminHealthPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="health" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Server />
              <span className="font-semibold">
                Infrastructure Monitoring
              </span>
            </div>

            <h1 className="text-3xl font-extrabold">
              System Health
            </h1>

            <p className="text-slate-400 mt-2">
              Monitor backend services, database, Redis queue, realtime server
              and performance metrics.
            </p>
          </div>

          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {metrics.map((item) => (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="text-blue-400 mb-5">
                  {item.icon}
                </div>

                <p className="text-slate-400">
                  {item.title}
                </p>

                <h2 className="text-3xl font-extrabold mt-2">
                  {item.value}
                </h2>
              </div>
            ))}
          </section>

          <section className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-6">
              Service Status
            </h2>

            <div className="space-y-5">
              {health.map((item) => (
                <div
                  key={item.name}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="font-bold">
                        {item.name}
                      </h3>

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
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}