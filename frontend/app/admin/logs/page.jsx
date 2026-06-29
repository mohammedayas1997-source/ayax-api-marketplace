import {
  Search,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

const logs = [
  {
    id: 1,
    user: "admin@ayaxdigital.solutions",
    endpoint: "/api/v1/data/buy",
    method: "POST",
    status: "200",
    response: "Success",
    ip: "192.168.1.20",
    date: "2026-06-17 10:25 AM",
  },
  {
    id: 2,
    user: "john@company.com",
    endpoint: "/api/v1/airtime/buy",
    method: "POST",
    status: "202",
    response: "Processing",
    ip: "192.168.1.55",
    date: "2026-06-17 11:02 AM",
  },
  {
    id: 3,
    user: "api@techhub.com",
    endpoint: "/api/v1/data/buy",
    method: "POST",
    status: "401",
    response: "Invalid API Key",
    ip: "192.168.1.88",
    date: "2026-06-16 04:41 PM",
  },
];

export default function AdminLogsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="logs" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-8">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Activity />
              <span className="font-semibold">Request Monitoring</span>
            </div>

            <h1 className="text-3xl font-extrabold">API Logs</h1>

            <p className="text-slate-400 mt-2">
              Monitor API requests, responses, users, IP addresses and status
              codes.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid md:grid-cols-[1fr_180px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />

                <input
                  placeholder="Search by email, endpoint, IP or response..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none text-white">
                <option>All Methods</option>
                <option>POST</option>
                <option>GET</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>

              <select className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none text-white">
                <option>All Status</option>
                <option>Success</option>
                <option>Processing</option>
                <option>Failed</option>
              </select>
            </div>
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>User</span>
              <span>Endpoint</span>
              <span>Method</span>
              <span>Status</span>
              <span>Response</span>
              <span>IP Address</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-slate-800">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid xl:grid-cols-7 gap-4 px-6 py-5 items-center"
                >
                  <span className="text-slate-300 break-all">
                    {log.user}
                  </span>

                  <span className="font-mono text-sm text-blue-400 break-all">
                    {log.endpoint}
                  </span>

                  <span className="w-fit bg-slate-800 px-3 py-1 rounded-full text-xs">
                    {log.method}
                  </span>

                  <StatusCode status={log.status} />

                  <span className="text-slate-300">
                    {log.response}
                  </span>

                  <span className="font-mono text-sm text-slate-500">
                    {log.ip}
                  </span>

                  <span className="text-sm text-slate-500">
                    {log.date}
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