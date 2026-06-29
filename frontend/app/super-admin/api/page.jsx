"use client";

import { useMemo, useState } from "react";
import {
  Server,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  Wifi,
  Database,
  Cpu,
  HardDrive,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const logsData = [
  {
    id: "LOG-1001",
    user: "api@techhub.com",
    endpoint: "/api/v1/data/buy",
    method: "POST",
    status: "200",
    response: "Success",
    latency: "120ms",
    ip: "192.168.1.20",
    date: "2026-06-19 10:25 AM",
  },
  {
    id: "LOG-1002",
    user: "john@company.com",
    endpoint: "/api/v1/airtime/buy",
    method: "POST",
    status: "202",
    response: "Processing",
    latency: "210ms",
    ip: "192.168.1.55",
    date: "2026-06-19 11:02 AM",
  },
  {
    id: "LOG-1003",
    user: "api@techhub.com",
    endpoint: "/api/v1/data/buy",
    method: "POST",
    status: "401",
    response: "Invalid API Key",
    latency: "80ms",
    ip: "192.168.1.88",
    date: "2026-06-18 04:41 PM",
  },
];

const services = [
  { name: "Backend API Server", status: "Operational", uptime: "99.98%", icon: Server },
  { name: "PostgreSQL Database", status: "Operational", uptime: "99.95%", icon: Database },
  { name: "Redis Queue", status: "Operational", uptime: "99.90%", icon: Activity },
  { name: "Socket.IO Realtime", status: "Operational", uptime: "99.92%", icon: Wifi },
];

export default function SuperApiMonitorPage() {
  const [logs, setLogs] = useState(logsData);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase();

    return logs.filter((log) => {
      const search =
        log.user.toLowerCase().includes(q) ||
        log.endpoint.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q) ||
        log.response.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q);

      const method = methodFilter === "ALL" || log.method === methodFilter;

      const status =
        statusFilter === "ALL" ||
        (statusFilter === "SUCCESS" && log.status === "200") ||
        (statusFilter === "PROCESSING" && log.status === "202") ||
        (statusFilter === "FAILED" && !["200", "202"].includes(log.status));

      return search && method && status;
    });
  }, [logs, query, methodFilter, statusFilter]);

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "200").length,
    processing: logs.filter((l) => l.status === "202").length,
    failed: logs.filter((l) => !["200", "202"].includes(l.status)).length,
  };

  const refreshLogs = () => {
    const newLog = {
      id: `LOG-${Date.now()}`,
      user: "live@customer.com",
      endpoint: "/api/v1/transaction/status",
      method: "GET",
      status: "200",
      response: "Success",
      latency: "95ms",
      ip: "192.168.1.101",
      date: new Date().toLocaleString("en-US"),
    };

    setLogs((prev) => [newLog, ...prev]);
    setMessage("API logs refreshed with latest live request.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="API Monitor" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Requests" value={stats.total} icon={<Server />} />
            <Stat title="Successful" value={stats.success} icon={<CheckCircle />} />
            <Stat title="Processing" value={stats.processing} icon={<Clock />} />
            <Stat title="Failed" value={stats.failed} icon={<XCircle />} />
          </section>

          <section className="grid xl:grid-cols-4 gap-6 mb-8">
            <Metric title="CPU Usage" value="42%" icon={<Cpu />} />
            <Metric title="Memory Usage" value="68%" icon={<HardDrive />} />
            <Metric title="Avg Latency" value="120ms" icon={<Activity />} />
            <Metric title="Error Rate" value="0.08%" icon={<AlertTriangle />} />
          </section>

          <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold">Infrastructure Status</h2>

                <button
                  onClick={refreshLogs}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
                >
                  <RefreshCcw size={18} />
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {services.map((service) => {
                  const Icon = service.icon;

                  return (
                    <div
                      key={service.name}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                          <Icon size={22} />
                        </div>

                        <div>
                          <h3 className="font-bold">{service.name}</h3>
                          <p className="text-sm text-slate-500">
                            Uptime: {service.uptime}
                          </p>
                        </div>
                      </div>

                      <span className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm flex items-center gap-2 w-fit">
                        <CheckCircle size={16} />
                        {service.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <Activity size={30} />
                <h2 className="text-2xl font-bold">Realtime API Health</h2>
              </div>

              <h3 className="text-5xl font-extrabold">99.9%</h3>

              <p className="text-blue-100 mt-4 leading-7">
                API gateway, database, Redis queue and realtime notification
                services are currently healthy.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-blue-100 text-sm">Success Rate</p>
                  <h4 className="text-2xl font-bold mt-1">98.7%</h4>
                </div>

                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-blue-100 text-sm">Avg Response</p>
                  <h4 className="text-2xl font-bold mt-1">120ms</h4>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_180px_180px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search logs by user, endpoint, IP, response or log ID..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
              </select>

              <button className="bg-slate-800 hover:bg-slate-700 rounded-2xl font-semibold flex items-center justify-center gap-2">
                <Download size={18} />
                Export
              </button>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>User</span>
              <span>Endpoint</span>
              <span>Method</span>
              <span>Status</span>
              <span>Response</span>
              <span>Latency</span>
              <span>IP Address</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                >
                  <span className="text-slate-300 break-all">{log.user}</span>

                  <span className="font-mono text-sm text-blue-400 break-all">
                    {log.endpoint}
                  </span>

                  <span className="w-fit bg-slate-800 px-3 py-1 rounded-full text-xs">
                    {log.method}
                  </span>

                  <StatusCode status={log.status} />

                  <span className="text-slate-300">{log.response}</span>
                  <span className="text-slate-400">{log.latency}</span>

                  <span className="font-mono text-sm text-slate-500">
                    {log.ip}
                  </span>

                  <span className="text-sm text-slate-500">{log.date}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusCode({ status }) {
  const isSuccess = status === "200";
  const isProcessing = status === "202";

  return (
    <span
      className={`w-fit px-3 py-1 rounded-full text-xs flex items-center gap-2 ${
        isSuccess
          ? "bg-green-500/10 text-green-400"
          : isProcessing
          ? "bg-yellow-500/10 text-yellow-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {isSuccess ? (
        <CheckCircle size={14} />
      ) : isProcessing ? (
        <Clock size={14} />
      ) : (
        <XCircle size={14} />
      )}
      {status}
    </span>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function Metric({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}