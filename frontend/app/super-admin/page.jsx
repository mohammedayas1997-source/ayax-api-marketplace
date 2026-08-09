"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle2,
  XCircle,
  Clock3,
  LoaderCircle,
  Radio,
  Database,
  Wifi,
  BellRing,
  WifiHigh,
  PhoneCall,
  PieChart,
  CircleDollarSign,
} from "lucide-react";

import useGatewaySocket from "@/hooks/useGatewaySocket";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";

const AUTO_REFRESH_INTERVAL = 30_000;
const MAX_LIVE_ACTIVITIES = 30;
const MAX_REQUESTS = 50;

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US");

const formatDateTime = (value) => {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString("en-US");
};

const getResponseData = (response) =>
  response?.data?.data || response?.data || {};

const normalizeDashboard = (response) => {
  const data = getResponseData(response);

  return {
    stats: data.stats || {},
    requests: Array.isArray(data.requests)
      ? data.requests
      : [],
    activities: Array.isArray(data.activities)
      ? data.activities
      : [],
    system: data.system || data.health || {},
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
};

const normalizeRequest = (request = {}) => ({
  id:
    request.id ||
    request._id ||
    `${request.type || "request"}-${request.createdAt || Date.now()}`,
  title:
    request.title ||
    request.name ||
    request.type ||
    "System Request",
  desc:
    request.desc ||
    request.description ||
    request.message ||
    "No description provided.",
  status:
    request.status ||
    request.priority ||
    "Pending",
  type: request.type || "GENERAL",
  createdAt:
    request.createdAt ||
    request.time ||
    new Date().toISOString(),
});

const normalizeActivity = (activity = {}) => ({
  id:
    activity.id ||
    activity._id ||
    `${activity.type || "activity"}-${activity.time || activity.createdAt || Date.now()}`,
  text:
    activity.text ||
    activity.message ||
    activity.description ||
    "System activity received.",
  type: activity.type || "INFO",
  time:
    activity.time ||
    activity.createdAt ||
    new Date().toISOString(),
});

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({});
  const [system, setSystem] = useState({});
  const [requests, setRequests] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const mountedRef = useRef(false);
  const refreshTimerRef = useRef(null);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await api.get(
          "/super-admin/dashboard"
        );

        const dashboard = normalizeDashboard(response);

        if (!mountedRef.current) return;

        setStats(dashboard.stats);
        setSystem(dashboard.system);

        setRequests(
          dashboard.requests
            .map(normalizeRequest)
            .slice(0, MAX_REQUESTS)
        );

        setActivities(
          dashboard.activities
            .map(normalizeActivity)
            .slice(0, MAX_LIVE_ACTIVITIES)
        );

        setLastUpdated(
          new Date(dashboard.updatedAt)
        );
      } catch (requestError) {
        if (!mountedRef.current) return;

        const backendMessage =
          requestError.response?.data?.message ||
          requestError.userMessage;

        setError(
          backendMessage && backendMessage.length < 220
            ? backendMessage
            : "The dashboard backend returned an error. Check the server logs and dashboard controller."
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = window.setTimeout(
      () => {
        loadDashboard({ silent: true });
        scheduleRefresh();
      },
      AUTO_REFRESH_INTERVAL
    );
  }, [loadDashboard]);

  useEffect(() => {
    mountedRef.current = true;

    loadDashboard();
    scheduleRefresh();

    return () => {
      mountedRef.current = false;
      window.clearTimeout(refreshTimerRef.current);
    };
  }, [loadDashboard, scheduleRefresh]);

  const refreshFromSocket = useCallback(() => {
    setLiveConnected(true);
    loadDashboard({ silent: true });
  }, [loadDashboard]);

  const addActivity = useCallback((payload) => {
    setLiveConnected(true);

    const activity = normalizeActivity(
      payload?.activity || payload
    );

    setActivities((current) => [
      activity,
      ...current.filter(
        (item) => item.id !== activity.id
      ),
    ].slice(0, MAX_LIVE_ACTIVITIES));

    setLastUpdated(new Date());
  }, []);

  const addRequest = useCallback((payload) => {
    setLiveConnected(true);

    const request = normalizeRequest(
      payload?.request || payload
    );

    setRequests((current) => [
      request,
      ...current.filter(
        (item) => item.id !== request.id
      ),
    ].slice(0, MAX_REQUESTS));

    setLastUpdated(new Date());
  }, []);

  const updateStats = useCallback((payload) => {
    setLiveConnected(true);

    const incoming =
      payload?.stats ||
      payload?.data?.stats ||
      payload;

    if (!incoming || typeof incoming !== "object") {
      return;
    }

    setStats((current) => ({
      ...current,
      ...incoming,
    }));

    setLastUpdated(new Date());
  }, []);

  const updateSystem = useCallback((payload) => {
    setLiveConnected(true);

    const incoming =
      payload?.system ||
      payload?.health ||
      payload;

    if (!incoming || typeof incoming !== "object") {
      return;
    }

    setSystem((current) => ({
      ...current,
      ...incoming,
    }));

    setLastUpdated(new Date());
  }, []);

  useGatewaySocket({
    connect: () => setLiveConnected(true),
    disconnect: () => setLiveConnected(false),

    "dashboard:update": (payload) => {
      setLiveConnected(true);

      if (payload?.stats) {
        updateStats(payload.stats);
      }

      if (payload?.system || payload?.health) {
        updateSystem(payload.system || payload.health);
      }

      if (payload?.activity) {
        addActivity(payload.activity);
      }

      if (payload?.request) {
        addRequest(payload.request);
      }

      if (
        !payload?.stats &&
        !payload?.system &&
        !payload?.health &&
        !payload?.activity &&
        !payload?.request
      ) {
        refreshFromSocket();
      }
    },

    "dashboard:stats": updateStats,
    "system-health-updated": updateSystem,
    "activity:new": addActivity,
    "notification:new": addActivity,
    "request:new": addRequest,

    "wallet-updated": refreshFromSocket,
    "gsm-command-updated": refreshFromSocket,
    "transaction-updated": refreshFromSocket,
    "gateway-device-online": refreshFromSocket,
    "gateway-device-offline": refreshFromSocket,
    "gateway-location": refreshFromSocket,
    "gateway-security-alert": (payload) => {
      addActivity({
        ...payload,
        type: "ALERT",
        text:
          payload?.message ||
          "A gateway security alert was received.",
      });

      refreshFromSocket();
    },
  });

  const statCards = useMemo(
    () => [
      {
        title: "Total Users",
        value: formatNumber(stats.totalUsers),
        icon: Users,
        tone: "blue",
      },
      {
        title: "Admins",
        value: formatNumber(stats.admins),
        icon: ShieldCheck,
        tone: "purple",
      },
      {
        title: "Customer Service",
        value: formatNumber(stats.customerService),
        icon: Headphones,
        tone: "cyan",
      },
      {
        title: "Company Wallet",
        value: formatNaira(stats.companyWallet),
        icon: Wallet,
        tone: "green",
      },
      {
        title: "Available Data Balance", // Ragowar Data a SIM (Live)
        value: stats.availableDataBalance || stats.dataBalance || "0 MB",
        icon: PieChart,
        tone: "indigo",
      },
      {
        title: "Available Airtime Balance", // Ragowar Kuɗin Airtime a SIM (Live)
        value: formatNaira(stats.availableAirtimeBalance || stats.airtimeBalance || 0),
        icon: CircleDollarSign,
        tone: "green",
      },
      {
        title: "Total Data Sales",
        value: formatNumber(stats.totalDataSales || stats.dataSalesCount || stats.totalData),
        icon: WifiHigh,
        tone: "blue",
      },
      {
        title: "Total Airtime Sales",
        value: formatNaira(stats.totalAirtimeSales || stats.totalAirtime),
        icon: PhoneCall,
        tone: "cyan",
      },
      {
        title: "Pending Funding",
        value: formatNumber(stats.pendingFunding),
        icon: CreditCard,
        tone: "yellow",
      },
      {
        title: "Pending Refunds",
        value: formatNumber(stats.pendingRefunds),
        icon: RefreshCcw,
        tone: "orange",
      },
      {
        title: "API Plans",
        value: formatNumber(stats.apiPlans),
        icon: Tags,
        tone: "indigo",
      },
      {
        title: "GSM SIMs",
        value: formatNumber(stats.gsmSims),
        icon: CircuitBoard,
        tone: "cyan",
      },
      {
        title: "API Calls",
        value: formatNumber(stats.apiCalls),
        icon: Server,
        tone: "blue",
      },
      {
        title: "Monthly Revenue",
        value: formatNaira(stats.monthlyRevenue),
        icon: BarChart3,
        tone: "green",
      },
      {
        title: "System Health",
        value:
          stats.systemHealth ||
          system.health ||
          "Unknown",
        icon: Activity,
        tone: "purple",
      },
      {
        title: "Low SIM Balance",
        value: formatNumber(stats.lowSimBalance),
        icon: AlertTriangle,
        tone: "red",
      },
    ],
    [stats, system]
  );

  const systemItems = useMemo(
    () => [
      {
        label: "API Server",
        value:
          system.api ||
          system.apiStatus ||
          "Unknown",
        icon: Server,
      },
      {
        label: "Database",
        value:
          system.database ||
          system.databaseStatus ||
          "Unknown",
        icon: Database,
      },
      {
        label: "Socket.IO",
        value:
          system.socket ||
          system.socketStatus ||
          (liveConnected
            ? "Connected"
            : "Disconnected"),
        icon: Wifi,
      },
      {
        label: "Gateway",
        value:
          system.gateway ||
          system.gatewayStatus ||
          "Unknown",
        icon: Radio,
      },
    ],
    [system, liveConnected]
  );

  const pendingRequestCount = requests.filter(
    (request) =>
      !["APPROVED", "COMPLETED", "RESOLVED"].includes(
        String(request.status).toUpperCase()
      )
  ).length;

  const handleManualRefresh = async () => {
    setMessage("");
    await loadDashboard({ silent: true });
    setMessage("Dashboard refreshed successfully.");

    window.setTimeout(() => {
      if (mountedRef.current) {
        setMessage("");
      }
    }, 4000);
  };

  return (
    <SuperAdminLayout
      title="Super Admin Dashboard"
      description="Live monitoring for users, wallet, funding, API marketplace, GSM gateway and system activity."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              liveConnected
                ? "bg-green-500/10 text-green-400"
                : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {liveConnected ? (
              <CheckCircle2 size={16} />
            ) : (
              <Clock3 size={16} />
            )}

            {liveConnected
              ? "Live updates connected"
              : "Waiting for live updates"}
          </span>

          <span className="text-sm text-slate-500">
            Last updated:{" "}
            {lastUpdated
              ? lastUpdated.toLocaleString("en-US")
              : "Never"}
          </span>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 font-semibold hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={17}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <XCircle size={20} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">
              Dashboard connection error
            </p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-300">
          {message}
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => (
              <StatCard
                key={item.title}
                item={item}
              />
            ))}
          </section>

          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {systemItems.map((item) => (
              <SystemStatusCard
                key={item.label}
                item={item}
              />
            ))}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Requests Center
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Funding, refunds, alerts and approval
                    requests.
                  </p>
                </div>

                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                  {pendingRequestCount} pending
                </span>
              </div>

              <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
                {requests.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No pending requests"
                    description="New requests will appear here automatically."
                  />
                ) : (
                  requests.map((item) => (
                    <RequestCard
                      key={item.id}
                      item={item}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Live Activity Feed
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Real-time platform and gateway events.
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  <Activity size={13} />
                  Live
                </span>
              </div>

              <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <EmptyState
                    icon={BellRing}
                    title="No recent activity"
                    description="Live system events will appear here."
                  />
                ) : (
                  activities.map((item) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </SuperAdminLayout>
  );
}

function StatCard({ item }) {
  const Icon = item.icon;

  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    green: "bg-green-500/10 text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    orange: "bg-orange-500/10 text-orange-400",
    indigo: "bg-indigo-500/10 text-indigo-400",
    red: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700">
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
          toneClasses[item.tone] ||
          toneClasses.blue
        }`}
      >
        <Icon size={24} />
      </div>

      <p className="text-sm text-slate-400">
        {item.title}
      </p>

      <h2 className="mt-2 break-words text-3xl font-extrabold">
        {item.value}
      </h2>
    </div>
  );
}

function SystemStatusCard({ item }) {
  const Icon = item.icon;
  const status = String(item.value || "Unknown");
  const normalized = status.toLowerCase();

  const healthy =
    normalized.includes("online") ||
    normalized.includes("connected") ||
    normalized.includes("healthy") ||
    normalized.includes("operational") ||
    normalized.includes("active") ||
    normalized === "ok";

  const unhealthy =
    normalized.includes("offline") ||
    normalized.includes("disconnected") ||
    normalized.includes("down") ||
    normalized.includes("failed") ||
    normalized.includes("error");

  const badgeClass = healthy
    ? "bg-green-500/10 text-green-400"
    : unhealthy
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-800 p-3 text-blue-400">
            <Icon size={21} />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 font-semibold">
              {status}
            </p>
          </div>
        </div>

        <span
          className={`h-3 w-3 rounded-full ${badgeClass}`}
        />
      </div>
    </div>
  );
}

function RequestCard({ item }) {
  const status = String(item.status || "Pending");
  const normalized = status.toUpperCase();

  const statusClass =
    normalized === "ALERT" ||
    normalized === "URGENT" ||
    normalized === "FAILED"
      ? "bg-red-500/10 text-red-400"
      : normalized === "APPROVED" ||
          normalized === "COMPLETED" ||
          normalized === "RESOLVED"
        ? "bg-green-500/10 text-green-400"
        : "bg-yellow-500/10 text-yellow-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold">
            {item.title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {item.desc}
          </p>

          <p className="mt-3 text-xs text-slate-600">
            {formatDateTime(item.createdAt)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${statusClass}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function ActivityCard({ item }) {
  const type = String(item.type || "INFO").toUpperCase();

  const dotClass =
    type.includes("FAILED") ||
    type.includes("ALERT") ||
    type.includes("ERROR")
      ? "bg-red-400"
      : type.includes("SUCCESS") ||
          type.includes("ONLINE") ||
          type.includes("COMPLETED")
        ? "bg-green-400"
        : type.includes("PENDING") ||
            type.includes("WARNING")
          ? "bg-yellow-400"
          : "bg-blue-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
        />

        <div className="min-w-0">
          <p className="leading-6 text-slate-300">
            {item.text}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(item.time)}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
      <Icon
        size={34}
        className="mx-auto text-slate-600"
      />

      <p className="mt-4 font-semibold text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map(
          (_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-3xl border border-slate-800 bg-slate-900"
            />
          )
        )}
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="h-[480px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900" />
        <div className="h-[480px] animate-pulse rounded-3xl border border-slate-800 bg-slate-900" />
      </section>

      <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle
          size={16}
          className="animate-spin"
        />
        Loading live dashboard data...
      </div>
    </div>
  );
}