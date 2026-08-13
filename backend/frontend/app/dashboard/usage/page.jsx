"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  Wifi,
  Smartphone,
  SearchCheck,
  TrendingUp,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeServiceName = (value) => {
  const name = String(value || "")
    .trim()
    .toUpperCase();

  if (name.includes("DATA")) return "Data API";
  if (name.includes("AIRTIME")) return "Airtime API";

  if (
    name.includes("VERIFY") ||
    name.includes("STATUS")
  ) {
    return "Transaction Status";
  }

  return value || "Other API";
};

export default function UsagePage() {
  const [usageLogs, setUsageLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchUsageLogs = useCallback(async () => {
    const possibleRoutes = [
      "/usage",
      "/api-usage",
      "/usage/logs",
    ];

    let finalError = null;

    for (const route of possibleRoutes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.usages ||
          response.data?.usageLogs ||
          response.data?.logs ||
          response.data?.data?.usages ||
          response.data?.data ||
          [];

        const normalizedList = Array.isArray(list)
          ? list
          : [];

        setUsageLogs(normalizedList);

        return normalizedList;
      } catch (error) {
        finalError = error;

        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw (
      finalError ||
      new Error("Usage endpoint was not found.")
    );
  }, []);

  const fetchTransactions = useCallback(async () => {
    const response = await api.get(
      "/wallet/transactions"
    );

    const list =
      response.data?.transactions ||
      response.data?.data?.transactions ||
      response.data?.data ||
      [];

    const normalizedList = Array.isArray(list)
      ? list
      : [];

    setTransactions(normalizedList);

    return normalizedList;
  }, []);

  const loadUsage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        const results = await Promise.allSettled([
          fetchUsageLogs(),
          fetchTransactions(),
        ]);

        const failed = results.find(
          (result) => result.status === "rejected"
        );

        if (failed) {
          setMessage(
            getErrorMessage(
              failed.reason,
              "Some usage information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchUsageLogs, fetchTransactions]
  );

  useEffect(() => {
    loadUsage();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleUsageUpdated = () => {
      fetchUsageLogs().catch(console.error);
      fetchTransactions().catch(console.error);
    };

    socket.on(
      "api-usage-created",
      handleUsageUpdated
    );

    socket.on(
      "usage-updated",
      handleUsageUpdated
    );

    socket.on(
      "transaction-updated",
      handleUsageUpdated
    );

    socket.on(
      "purchase-successful",
      handleUsageUpdated
    );

    socket.on(
      "purchase-failed",
      handleUsageUpdated
    );

    return () => {
      socket.off(
        "api-usage-created",
        handleUsageUpdated
      );

      socket.off(
        "usage-updated",
        handleUsageUpdated
      );

      socket.off(
        "transaction-updated",
        handleUsageUpdated
      );

      socket.off(
        "purchase-successful",
        handleUsageUpdated
      );

      socket.off(
        "purchase-failed",
        handleUsageUpdated
      );
    };
  }, [
    loadUsage,
    fetchUsageLogs,
    fetchTransactions,
  ]);

  const usageStats = useMemo(() => {
    const totalCalls = usageLogs.length;

    const dataCalls = usageLogs.filter((item) =>
      String(
        item?.endpoint ||
        item?.service ||
        item?.category ||
        ""
      )
        .toUpperCase()
        .includes("DATA")
    ).length;

    const airtimeCalls = usageLogs.filter((item) =>
      String(
        item?.endpoint ||
        item?.service ||
        item?.category ||
        ""
      )
        .toUpperCase()
        .includes("AIRTIME")
    ).length;

    const statusChecks = usageLogs.filter((item) => {
      const value = String(
        item?.endpoint ||
        item?.service ||
        item?.category ||
        ""
      ).toUpperCase();

      return (
        value.includes("VERIFY") ||
        value.includes("STATUS")
      );
    }).length;

    return {
      totalCalls,
      dataCalls,
      airtimeCalls,
      statusChecks,
    };
  }, [usageLogs]);

  const servicePerformance = useMemo(() => {
    const groups = {};

    for (const log of usageLogs) {
      const rawName =
        log?.service ||
        log?.category ||
        log?.endpoint ||
        "Other API";

      const name = normalizeServiceName(rawName);

      if (!groups[name]) {
        groups[name] = {
          name,
          calls: 0,
          successful: 0,
          revenue: 0,
        };
      }

      groups[name].calls += 1;

      const status = String(
        log?.status || ""
      ).toUpperCase();

      if (
        status === "SUCCESSFUL" ||
        status === "COMPLETED"
      ) {
        groups[name].successful += 1;
      }

      groups[name].revenue += Number(
        log?.amount || 0
      );
    }

    return Object.values(groups)
      .map((item) => ({
        ...item,
        successRate:
          item.calls > 0
            ? (item.successful / item.calls) * 100
            : 0,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [usageLogs]);

  const monthlyGrowth = useMemo(() => {
    const now = new Date();

    const currentMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const currentMonthCalls = usageLogs.filter(
      (item) => {
        if (!item?.createdAt) return false;

        return (
          new Date(item.createdAt) >=
          currentMonthStart
        );
      }
    ).length;

    const previousMonthCalls = usageLogs.filter(
      (item) => {
        if (!item?.createdAt) return false;

        const date = new Date(item.createdAt);

        return (
          date >= previousMonthStart &&
          date < currentMonthStart
        );
      }
    ).length;

    if (previousMonthCalls === 0) {
      return currentMonthCalls > 0 ? 100 : 0;
    }

    return (
      ((currentMonthCalls - previousMonthCalls) /
        previousMonthCalls) *
      100
    );
  }, [usageLogs]);

  const totalSpend = useMemo(
    () =>
      transactions
        .filter(
          (item) =>
            String(item?.type || "").toUpperCase() ===
            "DEBIT"
        )
        .reduce(
          (sum, item) =>
            sum + Number(item?.amount || 0),
          0
        ),
    [transactions]
  );

  const cards = [
    {
      title: "Total API Calls",
      value:
        usageStats.totalCalls.toLocaleString(
          "en-US"
        ),
      icon: <Activity />,
    },
    {
      title: "Data API Calls",
      value:
        usageStats.dataCalls.toLocaleString(
          "en-US"
        ),
      icon: <Wifi />,
    },
    {
      title: "Airtime API Calls",
      value:
        usageStats.airtimeCalls.toLocaleString(
          "en-US"
        ),
      icon: <Smartphone />,
    },
    {
      title: "Status Checks",
      value:
        usageStats.statusChecks.toLocaleString(
          "en-US"
        ),
      icon: <SearchCheck />,
    },
  ];

  return (
    <DashboardLayout
      title="Usage Statistics"
      description="Monitor API calls, success rate, revenue and service performance."
    >
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() =>
            loadUsage({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading usage statistics...
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="mb-5 text-blue-400">
                  {item.icon}
                </div>

                <p className="text-slate-400">
                  {item.title}
                </p>

                <h2 className="mt-2 text-3xl font-extrabold">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-400" />

              <h2 className="text-xl font-bold">
                API Performance
              </h2>
            </div>

            {servicePerformance.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                No API usage data yet.
              </div>
            ) : (
              <div className="space-y-5">
                {servicePerformance.map(
                  (service) => (
                    <div
                      key={service.name}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-bold">
                            {service.name}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {service.calls.toLocaleString(
                              "en-US"
                            )}{" "}
                            total calls
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
                            Revenue:{" "}
                            {formatNaira(
                              service.revenue
                            )}
                          </span>

                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
                            Success:{" "}
                            {service.successRate.toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(
                              service.successRate,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-blue-500 bg-gradient-to-br from-blue-600 to-slate-900 p-8">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp />

                <h2 className="text-2xl font-bold">
                  Monthly Growth
                </h2>
              </div>

              <p className="text-4xl font-extrabold">
                {monthlyGrowth >= 0 ? "+" : ""}
                {monthlyGrowth.toFixed(1)}%
              </p>

              <p className="mt-4 leading-8 text-blue-100">
                API usage growth compared with the
                previous month.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="text-blue-400" />

                <h2 className="text-2xl font-bold">
                  Total API Spend
                </h2>
              </div>

              <p className="text-4xl font-extrabold">
                {formatNaira(totalSpend)}
              </p>

              <p className="mt-4 leading-8 text-slate-400">
                Total successful debit transactions
                recorded for this account.
              </p>
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}