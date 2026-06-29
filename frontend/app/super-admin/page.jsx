"use client";

import { useEffect, useState } from "react";

import {
  Users,
  ShieldCheck,
  Headphones,
  Wallet,
  CreditCard,
  RefreshCcw,
  Tags,
  CircuitBoard,
  Server,
  BarChart3,
  Activity,
  AlertTriangle,
} from "lucide-react";

import SuperSidebar from "./components/SuperSidebar";
import SuperTopbar from "./components/SuperTopbar";
import api from "@/lib/api";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const res = await api.get("/super-admin/dashboard");

      setStats(res.data.stats || {});
      setRequests(res.data.requests || []);
      setActivities(res.data.activities || []);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers || 0, icon: Users },
    { title: "Admins", value: stats?.admins || 0, icon: ShieldCheck },
    {
      title: "Customer Service",
      value: stats?.customerService || 0,
      icon: Headphones,
    },
    {
      title: "Company Wallet",
      value: formatNaira(stats?.companyWallet || 0),
      icon: Wallet,
    },
    {
      title: "Pending Funding",
      value: stats?.pendingFunding || 0,
      icon: CreditCard,
    },
    {
      title: "Pending Refunds",
      value: stats?.pendingRefunds || 0,
      icon: RefreshCcw,
    },
    { title: "API Plans", value: stats?.apiPlans || 0, icon: Tags },
    { title: "GSM SIMs", value: stats?.gsmSims || 0, icon: CircuitBoard },
    { title: "API Calls", value: stats?.apiCalls || 0, icon: Server },
    {
      title: "Monthly Revenue",
      value: formatNaira(stats?.monthlyRevenue || 0),
      icon: BarChart3,
    },
    {
      title: "System Health",
      value: stats?.systemHealth || "99.9%",
      icon: Activity,
    },
    {
      title: "Low SIM Balance",
      value: stats?.lowSimBalance || 0,
      icon: AlertTriangle,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Super Admin Dashboard" />

          {loading ? (
            <div className="text-slate-400">Loading dashboard...</div>
          ) : (
            <>
              <section
                className="grid gap-5 mb-8"
                style={{
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                }}
              >
                {statCards.map((item) => (
                  <StatCard key={item.title} item={item} />
                ))}
              </section>

              <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-5">
                    Requests Center
                  </h2>

                  <div className="space-y-4">
                    {requests.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <h3 className="font-bold">{item.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">
                            {item.desc}
                          </p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            item.status === "Alert"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-5">
                    Live Activity Feed
                  </h2>

                  <div className="space-y-4">
                    {activities.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                      >
                        <p className="text-slate-300">{item.text}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.time
                            ? new Date(item.time).toLocaleString()
                            : "Just now"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ item }) {
  const Icon = item.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-5">
        <Icon size={26} />
      </div>

      <p className="text-slate-400 text-sm">{item.title}</p>

      <h2 className="text-3xl font-extrabold mt-2">{item.value}</h2>
    </div>
  );
}