"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  Search,
  RefreshCcw,
  Clock3,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

export default function ApiUsagePage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const loadUsage = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;

      const [usageRes, statsRes] = await Promise.all([
        api.get("/api-usage", { params }),
        api.get("/api-usage/statistics"),
      ]);

      setLogs(usageRes.data.usages || []);
      setStats(statsRes.data.stats || {});
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to load usage logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="API Usage">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Usage"
      description="Monitor every API request made by developers."
    >
      {message && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {message}
        </div>
      )}

      <KpiGrid
        items={[
          {
            title: "Total Calls",
            value: stats.totalCalls || logs.length,
            icon: <Activity />,
            color: "blue",
          },
          {
            title: "Successful",
            value:
              stats.success ||
              logs.filter((x) => x.status === "SUCCESS").length,
            icon: <CheckCircle />,
            color: "green",
          },
          {
            title: "Failed",
            value:
              stats.failed ||
              logs.filter((x) => x.status === "FAILED").length,
            icon: <XCircle />,
            color: "red",
          },
          {
            title: "Avg Response",
            value: `${stats.averageResponse || 0} ms`,
            icon: <Clock3 />,
            color: "yellow",
          },
        ]}
      />

      <div className="my-6 flex gap-4">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search usage..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <ActionButton
          icon={<RefreshCcw size={18} />}
          onClick={loadUsage}
        >
          Refresh
        </ActionButton>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-8 gap-4 border-b border-slate-800 px-6 py-4 text-sm text-slate-400 font-semibold">
          <span>User</span>
          <span>Service</span>
          <span>Endpoint</span>
          <span>Method</span>
          <span>Status</span>
          <span>Response</span>
          <span>IP</span>
          <span>Time</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-slate-500">
            No usage records found.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-8 gap-4 border-b border-slate-800 px-6 py-5"
            >
              <span>{log.user?.email || "-"}</span>

              <span>{log.service?.name || "-"}</span>

              <span className="truncate">
                {log.endpoint || "-"}
              </span>

              <span>{log.method || "-"}</span>

              <span
                className={`font-semibold ${
                  log.status === "SUCCESS"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {log.status}
              </span>

              <span>{log.responseTime || 0} ms</span>

              <span>{log.ipAddress || "-"}</span>

              <span>
                {log.createdAt
                  ? new Date(log.createdAt).toLocaleString()
                  : "-"}
              </span>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}