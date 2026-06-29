"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Layers,
  Tags,
  KeyRound,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Database,
  Radio,
  RefreshCcw,
  PlusCircle,
  FileText,
  Webhook,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import KpiGrid from "../components/KpiGrid";
import ActionButton from "../components/ActionButton";
import LoadingSkeleton from "../components/LoadingSkeleton";
import api from "@/lib/api";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function ApiMarketplaceDashboardPage() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [system, setSystem] = useState({});
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const res = await api.get("/api-marketplace/dashboard");

      setStats(res.data.stats || {});
      setActivities(res.data.activities || []);
      setSystem(res.data.system || {});
    } catch (error) {
      console.error("API Marketplace dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="API Marketplace">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Marketplace"
      description="Manage API providers, services, plans, keys, usage logs and webhooks."
    >
      <div className="mb-6 flex justify-end">
        <ActionButton icon={<RefreshCcw size={18} />} onClick={loadDashboard}>
          Refresh
        </ActionButton>
      </div>

      <div className="mb-8">
        <KpiGrid
          items={[
            {
              title: "Providers",
              value: stats?.providers || 0,
              icon: <Server />,
              color: "blue",
            },
            {
              title: "Active Providers",
              value: stats?.activeProviders || 0,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Services",
              value: stats?.services || 0,
              icon: <Layers />,
              color: "purple",
            },
            {
              title: "API Plans",
              value: stats?.plans || 0,
              icon: <Tags />,
              color: "yellow",
            },
            {
              title: "API Keys",
              value: stats?.apiKeys || 0,
              icon: <KeyRound />,
              color: "blue",
            },
            {
              title: "Calls Today",
              value: stats?.todayCalls || 0,
              icon: <Activity />,
              color: "green",
            },
            {
              title: "Failed Calls",
              value: stats?.failedCalls || 0,
              icon: <AlertTriangle />,
              color: "red",
            },
            {
              title: "Monthly Revenue",
              value: formatNaira(stats?.monthlyRevenue || 0),
              icon: <BarChart3 />,
              color: "purple",
            },
          ]}
        />
      </div>

      <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-5">Quick Actions</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <QuickAction href="/super-admin/api-marketplace/providers" icon={<PlusCircle />} title="Add Provider" />
            <QuickAction href="/super-admin/api-marketplace/services" icon={<Layers />} title="Manage Services" />
            <QuickAction href="/super-admin/api-marketplace/plans" icon={<Tags />} title="Create API Plan" />
            <QuickAction href="/super-admin/api-marketplace/api-keys" icon={<KeyRound />} title="API Keys" />
            <QuickAction href="/super-admin/api-marketplace/docs" icon={<FileText />} title="API Docs" />
            <QuickAction href="/super-admin/api-marketplace/webhooks" icon={<Webhook />} title="Webhooks" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-5">System Status</h2>

          <StatusRow icon={<Database />} label="Database" value={system.database || "UNKNOWN"} />
          <StatusRow icon={<Radio />} label="Socket.IO" value={system.socket || "UNKNOWN"} />
          <StatusRow icon={<Server />} label="Redis" value={system.redis || "UNKNOWN"} />
          <StatusRow icon={<Activity />} label="Success Rate" value={stats?.successRate || "100%"} />
        </div>
      </section>

      <section className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h2 className="text-xl font-bold mb-5">Recent API Activity</h2>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-slate-500">No API usage yet.</p>
          ) : (
            activities.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-slate-300">{item.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.time ? new Date(item.time).toLocaleString() : "-"}
                  </p>
                </div>

                <span className="text-sm text-slate-400">
                  {item.status || "UNKNOWN"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

function QuickAction({ href, icon, title }) {
  return (
    <a
      href={href}
      className="bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-2xl p-5 flex items-center gap-3 transition"
    >
      <span className="text-blue-400">{icon}</span>
      <span className="font-semibold">{title}</span>
    </a>
  );
}

function StatusRow({ icon, label, value }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-blue-400">{icon}</span>
        <span className="text-slate-300">{label}</span>
      </div>

      <span className="text-green-400 text-sm">{value}</span>
    </div>
  );
}