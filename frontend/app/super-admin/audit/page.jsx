"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  Download,
  ShieldCheck,
  UserCheck,
  Wallet,
  RefreshCcw,
  Tags,
  LockKeyhole,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const auditLogsData = [
  {
    id: "AUD-1001",
    user: "admin@ayaxdigital.solutions",
    role: "ADMIN",
    action: "APPROVE_FUNDING",
    module: "WALLET",
    description: "Approved ₦50,000 funding for Tech Hub Ltd",
    ip: "192.168.1.20",
    status: "SUCCESS",
    date: "2026-06-19 10:25 AM",
  },
  {
    id: "AUD-1002",
    user: "support@ayaxdigital.solutions",
    role: "CUSTOMER_SERVICE",
    action: "CREATE_REFUND_REQUEST",
    module: "REFUND",
    description: "Created refund request for failed Airtime VTU transaction",
    ip: "192.168.1.55",
    status: "SUCCESS",
    date: "2026-06-19 11:02 AM",
  },
  {
    id: "AUD-1003",
    user: "gsm@ayaxdigital.solutions",
    role: "STAFF_ADMIN",
    action: "RECHARGE_SIM",
    module: "GSM_GATEWAY",
    description: "Recharged SIM 12 with ₦5,000",
    ip: "192.168.1.77",
    status: "SUCCESS",
    date: "2026-06-19 12:11 PM",
  },
  {
    id: "AUD-1004",
    user: "admin@ayaxdigital.solutions",
    role: "ADMIN",
    action: "INVALID_PIN",
    module: "SECURITY",
    description: "Invalid PIN attempt while approving refund",
    ip: "192.168.1.88",
    status: "FAILED",
    date: "2026-06-19 01:40 PM",
  },
];

export default function SuperAuditPage() {
  const [logs, setLogs] = useState(auditLogsData);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase();

    return logs.filter((log) => {
      const search =
        log.id.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q);

      const moduleMatch = moduleFilter === "ALL" || log.module === moduleFilter;
      const statusMatch = statusFilter === "ALL" || log.status === statusFilter;

      return search && moduleMatch && statusMatch;
    });
  }, [logs, query, moduleFilter, statusFilter]);

  const stats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "SUCCESS").length,
    failed: logs.filter((l) => l.status === "FAILED").length,
    security: logs.filter((l) => l.module === "SECURITY").length,
  };

  const refreshLogs = () => {
    const newLog = {
      id: `AUD-${Date.now()}`,
      user: "superadmin@ayaxdigital.solutions",
      role: "SUPER_ADMIN",
      action: "REFRESH_AUDIT_LOGS",
      module: "AUDIT",
      description: "Super Admin refreshed audit logs",
      ip: "127.0.0.1",
      status: "SUCCESS",
      date: new Date().toLocaleString("en-US"),
    };

    setLogs((prev) => [newLog, ...prev]);
    setMessage("Audit logs refreshed.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Audit Logs" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Logs" value={stats.total} icon={<ClipboardList />} />
            <Stat title="Successful" value={stats.success} icon={<CheckCircle />} />
            <Stat title="Failed" value={stats.failed} icon={<XCircle />} />
            <Stat title="Security Alerts" value={stats.security} icon={<AlertTriangle />} />
          </section>

          <section className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck size={32} />
              <h2 className="text-2xl font-bold">System Accountability</h2>
            </div>

            <p className="text-blue-100 leading-8">
              Every sensitive action across funding, refund, pricing, GSM gateway,
              users, wallet, support, and security must be recorded here for Super Admin review.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_200px_180px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search audit logs by user, action, module, IP or description..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="WALLET">WALLET</option>
                <option value="REFUND">REFUND</option>
                <option value="FUNDING">FUNDING</option>
                <option value="PRICING">PRICING</option>
                <option value="GSM_GATEWAY">GSM_GATEWAY</option>
                <option value="SECURITY">SECURITY</option>
                <option value="AUDIT">AUDIT</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>

              <button
                onClick={refreshLogs}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Activity size={18} />
                Refresh
              </button>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
              <span>Module</span>
              <span>Description</span>
              <span>IP Address</span>
              <span>Status</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                >
                  <div>
                    <h3 className="font-semibold break-all">{log.user}</h3>
                    <p className="text-xs text-slate-500">{log.id}</p>
                  </div>

                  <RoleBadge role={log.role} />

                  <span className="text-blue-400 font-mono text-xs break-all">
                    {log.action}
                  </span>

                  <ModuleBadge module={log.module} />

                  <span className="text-slate-400 text-sm">
                    {log.description}
                  </span>

                  <span className="text-slate-500 font-mono text-sm">
                    {log.ip}
                  </span>

                  <StatusBadge status={log.status} />

                  <span className="text-slate-500 text-sm">{log.date}</span>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No audit log found.
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 grid xl:grid-cols-3 gap-6">
            <SecurityCard
              title="PIN Attempts"
              value="4"
              desc="Invalid PIN attempts today"
              icon={<LockKeyhole />}
            />
            <SecurityCard
              title="Wallet Actions"
              value="18"
              desc="Credit, debit, funding and refund logs"
              icon={<Wallet />}
            />
            <SecurityCard
              title="User Actions"
              value="42"
              desc="Login, role changes and account updates"
              icon={<UserCheck />}
            />
          </section>
        </section>
      </div>
    </main>
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

function StatusBadge({ status }) {
  const style =
    status === "SUCCESS"
      ? "bg-green-500/10 text-green-400"
      : "bg-red-500/10 text-red-400";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs ${style}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const style =
    role === "SUPER_ADMIN"
      ? "bg-blue-500/10 text-blue-400"
      : role === "ADMIN"
      ? "bg-purple-500/10 text-purple-400"
      : role === "CUSTOMER_SERVICE"
      ? "bg-green-500/10 text-green-400"
      : "bg-slate-700 text-slate-300";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs ${style}`}>
      {role}
    </span>
  );
}

function ModuleBadge({ module }) {
  const icons = {
    WALLET: <Wallet size={13} />,
    REFUND: <RefreshCcw size={13} />,
    PRICING: <Tags size={13} />,
    SECURITY: <LockKeyhole size={13} />,
    GSM_GATEWAY: <Activity size={13} />,
  };

  return (
    <span className="w-fit bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs flex items-center gap-2">
      {icons[module] || <ClipboardList size={13} />}
      {module}
    </span>
  );
}

function SecurityCard({ title, value, desc, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
      <p className="text-slate-500 text-sm mt-3">{desc}</p>
    </div>
  );
}