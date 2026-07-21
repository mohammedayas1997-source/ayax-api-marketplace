"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  KeyRound,
  Activity,
  BarChart3,
  ArrowUpRight,
  Copy,
  PlusCircle,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";

import { socket } from "@/lib/socket";
import api from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

/**
 * Wannan zai gwada endpoints ɗin usage da ake yawan amfani da su.
 * Da zarar mun ga backend usage route ɗinka, za mu bar guda ɗaya kawai.
 */
const fetchFirstAvailable = async (paths) => {
  let lastError = null;

  for (const path of paths) {
    try {
      return await api.get(path);
    } catch (error) {
      lastError = error;

      // Idan endpoint babu ne kawai, sai ya gwada na gaba.
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Usage endpoint was not found.");
};

export default function DashboardPage() {
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.get("/wallet");

      const walletData =
        res.data?.wallet ||
        res.data?.data?.wallet ||
        res.data?.data ||
        null;

      setWallet(walletData);

      return walletData;
    } catch (error) {
      console.error("Wallet load error:", error);
      throw error;
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await api.get("/api-keys");

      const keys =
        res.data?.keys ||
        res.data?.apiKeys ||
        res.data?.data?.keys ||
        res.data?.data ||
        [];

      setApiKeys(Array.isArray(keys) ? keys : []);

      return keys;
    } catch (error) {
      console.error("API keys load error:", error);
      throw error;
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get("/wallet/transactions");

      const list =
        res.data?.transactions ||
        res.data?.data?.transactions ||
        res.data?.data ||
        [];

      setTransactions(Array.isArray(list) ? list : []);

      return list;
    } catch (error) {
      console.error("Transactions load error:", error);
      throw error;
    }
  }, []);

  const fetchUsageLogs = useCallback(async () => {
    try {
      const res = await fetchFirstAvailable([
        "/usage",
        "/api-usage",
        "/usage/logs",
      ]);

      const logs =
        res.data?.usages ||
        res.data?.usageLogs ||
        res.data?.logs ||
        res.data?.data?.usages ||
        res.data?.data ||
        [];

      setUsageLogs(Array.isArray(logs) ? logs : []);

      return logs;
    } catch (error) {
      /*
       * Kada usage endpoint ya hana sauran dashboard aiki.
       * Za mu daidaita exact route idan ka turo backend usage route.
       */
      console.warn("Usage logs not available:", error);
      setUsageLogs([]);
      return [];
    }
  }, []);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        const results = await Promise.allSettled([
          fetchWallet(),
          fetchApiKeys(),
          fetchTransactions(),
          fetchUsageLogs(),
        ]);

        const failedResults = results.filter(
          (result) => result.status === "rejected"
        );

        if (failedResults.length > 0) {
          const firstError = failedResults[0]?.reason;

          setMessage(
            getErrorMessage(
              firstError,
              "Some dashboard information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchWallet,
      fetchApiKeys,
      fetchTransactions,
      fetchUsageLogs,
    ]
  );

  useEffect(() => {
    loadDashboard();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = {
        token,
      };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleWalletUpdated = () => {
      fetchWallet().catch(console.error);
      fetchTransactions().catch(console.error);
    };

    const handleApiKeyChanged = () => {
      fetchApiKeys().catch(console.error);
    };

    const handleTransactionChanged = () => {
      fetchTransactions().catch(console.error);
      fetchWallet().catch(console.error);
      fetchUsageLogs().catch(console.error);
    };

    const handleUsageUpdated = () => {
      fetchUsageLogs().catch(console.error);
    };

    socket.on("wallet-updated", handleWalletUpdated);
    socket.on("api-key-created", handleApiKeyChanged);
    socket.on("api-key-updated", handleApiKeyChanged);
    socket.on("api-key-revoked", handleApiKeyChanged);

    socket.on("purchase-successful", handleTransactionChanged);
    socket.on("transaction-updated", handleTransactionChanged);
    socket.on("api-usage-created", handleUsageUpdated);
    socket.on("usage-updated", handleUsageUpdated);

    return () => {
      socket.off("wallet-updated", handleWalletUpdated);
      socket.off("api-key-created", handleApiKeyChanged);
      socket.off("api-key-updated", handleApiKeyChanged);
      socket.off("api-key-revoked", handleApiKeyChanged);

      socket.off("purchase-successful", handleTransactionChanged);
      socket.off("transaction-updated", handleTransactionChanged);
      socket.off("api-usage-created", handleUsageUpdated);
      socket.off("usage-updated", handleUsageUpdated);

      /*
       * Kar a yi socket.disconnect() a nan,
       * saboda sauran dashboard pages na iya amfani da socket ɗin.
       */
    };
  }, [
    loadDashboard,
    fetchWallet,
    fetchApiKeys,
    fetchTransactions,
    fetchUsageLogs,
  ]);

  const activeApiKeys = useMemo(
    () =>
      apiKeys.filter(
        (key) =>
          String(key?.status || "").toUpperCase() === "ACTIVE"
      ),
    [apiKeys]
  );

  const liveKey = activeApiKeys[0]?.key || "";

  const totalSpend = useMemo(
    () =>
      transactions
        .filter((transaction) => {
          const type = String(
            transaction?.type || ""
          ).toUpperCase();

          return type === "DEBIT";
        })
        .reduce(
          (sum, transaction) =>
            sum + Number(transaction?.amount || 0),
          0
        ),
    [transactions]
  );

  const stats = [
    {
      title: "Wallet Balance",
      value: formatNaira(wallet?.balance || 0),
      icon: <Wallet size={24} />,
    },
    {
      title: "API Calls",
      value: usageLogs.length.toLocaleString("en-US"),
      icon: <Activity size={24} />,
    },
    {
      title: "Active API Keys",
      value: activeApiKeys.length,
      icon: <KeyRound size={24} />,
    },
    {
      title: "Total Spend",
      value: formatNaira(totalSpend),
      icon: <BarChart3 size={24} />,
    },
  ];

  const copyApiKey = async () => {
    if (!liveKey) return;

    try {
      await navigator.clipboard.writeText(liveKey);
      setMessage("API key copied successfully.");
    } catch (error) {
      setMessage("Unable to copy API key.");
    }
  };

  return (
    <DashboardLayout
      title="Developer Dashboard"
      description="Manage wallet, API keys, usage logs and live transactions."
    >
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-10 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => loadDashboard({ silent: true })}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        <Link
          href="/dashboard/wallet"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Fund Wallet
        </Link>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          Loading live dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                    {item.icon}
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-slate-500"
                  />
                </div>

                <p className="mt-5 text-slate-400">
                  {item.title}
                </p>

                <h2 className="mt-2 text-3xl font-extrabold">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">
                  Recent Transactions
                </h2>

                <Link
                  href="/dashboard/transactions"
                  className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-slate-500">
                    No transactions yet.
                  </p>
                ) : (
                  transactions.slice(0, 5).map((transaction) => {
                    const transactionStatus = String(
                      transaction?.status || "PENDING"
                    ).toUpperCase();

                    return (
                      <div
                        key={
                          transaction.id ||
                          transaction.reference
                        }
                        className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <h3 className="font-semibold">
                            {transaction.service ||
                              transaction.description ||
                              "Transaction"}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {transaction.reference || "-"}
                          </p>

                          {transaction.createdAt && (
                            <p className="mt-1 text-xs text-slate-600">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold">
                            {formatNaira(transaction.amount)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              transactionStatus === "SUCCESSFUL"
                                ? "bg-green-500/10 text-green-400"
                                : transactionStatus === "FAILED"
                                ? "bg-red-500/10 text-red-400"
                                : transactionStatus === "PROCESSING"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {transactionStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-5 text-xl font-bold">
                Live API Key
              </h2>

              <p className="mb-4 text-sm text-slate-400">
                Use this key in your request header as{" "}
                <code className="text-blue-400">x-api-key</code>.
              </p>

              <div className="break-all rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                {liveKey || "No active API key found"}
              </div>

              <button
                type="button"
                onClick={copyApiKey}
                disabled={!liveKey}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy size={18} />
                Copy API Key
              </button>

              <Link
                href="/dashboard/api-keys"
                className="mt-4 block text-center font-semibold text-blue-400 hover:text-blue-300"
              >
                Manage API Keys
              </Link>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}