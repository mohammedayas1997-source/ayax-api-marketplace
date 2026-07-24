"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Cable,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Copy,
  FileText,
  Fingerprint,
  KeyRound,
  Lightbulb,
  MessageSquareText,
  PlusCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Signal,
  Smartphone,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

import { socket } from "@/lib/socket";
import api from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

/* ======================================================
   FORMATTERS
====================================================== */

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCompactNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.userMessage ||
  error?.message ||
  fallback;

/* ======================================================
   USAGE API FALLBACK
====================================================== */

const fetchFirstAvailable = async (paths) => {
  let lastError = null;

  for (const path of paths) {
    try {
      return await api.get(path);
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error("Usage endpoint was not found.")
  );
};

/* ======================================================
   SERVICE DISPLAY CONFIGURATION
====================================================== */

const SERVICE_CONFIG = {
  DATA: {
    title: "Data Plans",
    subtitle: "Current internet bundle prices",
    icon: Wifi,
    href: "/dashboard/data",
  },

  AIRTIME: {
    title: "Airtime Rates",
    subtitle: "Current airtime API prices",
    icon: Smartphone,
    href: "/dashboard/airtime",
  },

  BVN: {
    title: "BVN Services",
    subtitle: "BVN verification and printing prices",
    icon: ShieldCheck,
    href: "/dashboard/bvn",
  },

  NIN: {
    title: "NIN Services",
    subtitle: "NIN verification and printing prices",
    icon: Fingerprint,
    href: "/dashboard/nin",
  },

  CABLE: {
    title: "Cable Packages",
    subtitle: "Current television subscription prices",
    icon: Cable,
    href: "/dashboard/cable",
  },

  ELECTRICITY: {
    title: "Electricity Services",
    subtitle: "Current electricity API charges",
    icon: Lightbulb,
    href: "/dashboard/electricity",
  },

  PRINTING: {
    title: "Printing Services",
    subtitle: "Current document-printing prices",
    icon: FileText,
    href: "/dashboard/printing",
  },

  SMS: {
    title: "SMS Services",
    subtitle: "Current messaging API prices",
    icon: MessageSquareText,
    href: "/dashboard/sms",
  },

  GSM: {
    title: "GSM Gateway",
    subtitle: "Current gateway service prices",
    icon: Signal,
    href: "/dashboard/gateway",
  },

  DEFAULT: {
    title: "Digital Services",
    subtitle: "Current service plans and prices",
    icon: Zap,
    href: "/dashboard",
  },
};

/* ======================================================
   PRICING NORMALIZATION
====================================================== */

const normalizePricingPlan = (item = {}) => ({
  id:
    item.id ||
    item.serviceCode ||
    item.code,

  serviceCode:
    item.serviceCode ||
    item.code ||
    "",

  serviceName:
    item.serviceName ||
    item.name ||
    "Service Plan",

  category: String(
    item.category ||
      item.service?.category ||
      "OTHER"
  ).toUpperCase(),

  tier: String(
    item.tier ||
      item.packageType ||
      "REGULAR"
  ).toUpperCase(),

  costPrice: Number(
    item.costPrice || 0
  ),

  sellingPrice: Number(
    item.sellingPrice ||
      item.price ||
      item.amount ||
      0
  ),

  currency:
    item.currency || "NGN",

  enabled:
    item.enabled !== false &&
    item.status !== "DISABLED",

  features:
    item.features &&
    typeof item.features === "object"
      ? item.features
      : {},

  metadata:
    item.metadata &&
    typeof item.metadata === "object"
      ? item.metadata
      : {},

  updatedAt:
    item.updatedAt ||
    item.createdAt ||
    null,
});

const buildPricingCategories = (
  responseData
) => {
  if (
    Array.isArray(
      responseData?.categories
    )
  ) {
    return responseData.categories.map(
      (categoryItem) => ({
        category: String(
          categoryItem.category ||
            "OTHER"
        ).toUpperCase(),

        title:
          categoryItem.title ||
          categoryItem.category,

        plans: Array.isArray(
          categoryItem.plans
        )
          ? categoryItem.plans
              .map(normalizePricingPlan)
              .filter(
                (plan) => plan.enabled
              )
          : [],
      })
    );
  }

  if (
    responseData?.groupedPricing &&
    typeof responseData.groupedPricing ===
      "object"
  ) {
    return Object.entries(
      responseData.groupedPricing
    ).map(
      ([category, plans]) => ({
        category:
          String(category).toUpperCase(),

        title: category,

        plans: Array.isArray(plans)
          ? plans
              .map(normalizePricingPlan)
              .filter(
                (plan) => plan.enabled
              )
          : [],
      })
    );
  }

  const rawPlans =
    responseData?.pricing ||
    responseData?.plans ||
    responseData?.data?.pricing ||
    responseData?.data?.plans ||
    responseData?.data ||
    [];

  const normalizedPlans =
    Array.isArray(rawPlans)
      ? rawPlans
          .map(normalizePricingPlan)
          .filter(
            (plan) => plan.enabled
          )
      : [];

  const categoryMap =
    normalizedPlans.reduce(
      (groups, plan) => {
        if (
          !groups[plan.category]
        ) {
          groups[plan.category] = [];
        }

        groups[
          plan.category
        ].push(plan);

        return groups;
      },
      {}
    );

  return Object.entries(
    categoryMap
  ).map(([category, plans]) => ({
    category,
    title: category,
    plans,
  }));
};

/* ======================================================
   DASHBOARD
====================================================== */

export default function DashboardPage() {
  const [wallet, setWallet] =
    useState(null);

  const [apiKeys, setApiKeys] =
    useState([]);

  const [
    transactions,
    setTransactions,
  ] = useState([]);

  const [usageLogs, setUsageLogs] =
    useState([]);

  const [
    pricingCategories,
    setPricingCategories,
  ] = useState([]);

  const [
    pricingSearch,
    setPricingSearch,
  ] = useState("");

  const [
    selectedTier,
    setSelectedTier,
  ] = useState("ALL");

  const [
    expandedPricing,
    setExpandedPricing,
  ] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  /* ====================================================
     FETCH WALLET
  ==================================================== */

  const fetchWallet =
    useCallback(async () => {
      try {
        const response =
          await api.get("/wallet");

        const walletData =
          response.data?.wallet ||
          response.data?.data?.wallet ||
          response.data?.data ||
          null;

        setWallet(walletData);

        return walletData;
      } catch (error) {
        console.error(
          "Wallet load error:",
          error
        );

        throw error;
      }
    }, []);

  /* ====================================================
     FETCH API KEYS
  ==================================================== */

  const fetchApiKeys =
    useCallback(async () => {
      try {
        const response =
          await api.get("/api-keys");

        const keys =
          response.data?.keys ||
          response.data?.apiKeys ||
          response.data?.data?.keys ||
          response.data?.data ||
          [];

        const safeKeys =
          Array.isArray(keys)
            ? keys
            : [];

        setApiKeys(safeKeys);

        return safeKeys;
      } catch (error) {
        console.error(
          "API keys load error:",
          error
        );

        throw error;
      }
    }, []);

  /* ====================================================
     FETCH TRANSACTIONS
  ==================================================== */

  const fetchTransactions =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/wallet/transactions"
          );

        const list =
          response.data?.transactions ||
          response.data?.history ||
          response.data?.data
            ?.transactions ||
          response.data?.data ||
          [];

        const safeList =
          Array.isArray(list)
            ? list
            : [];

        setTransactions(safeList);

        return safeList;
      } catch (error) {
        console.error(
          "Transactions load error:",
          error
        );

        throw error;
      }
    }, []);

  /* ====================================================
     FETCH USAGE LOGS
  ==================================================== */

  const fetchUsageLogs =
    useCallback(async () => {
      try {
        const response =
          await fetchFirstAvailable([
            "/api-usage/history?limit=100",
            "/api-usage/requests?limit=100",
            "/api-usage?limit=100",
          ]);

        const logs =
          response.data?.usages ||
          response.data?.requests ||
          response.data
            ?.recentRequests ||
          response.data?.usageLogs ||
          response.data?.logs ||
          response.data?.data
            ?.usages ||
          response.data?.data ||
          [];

        const safeLogs =
          Array.isArray(logs)
            ? logs
            : [];

        setUsageLogs(safeLogs);

        return safeLogs;
      } catch (error) {
        console.warn(
          "Usage logs not available:",
          error
        );

        setUsageLogs([]);

        return [];
      }
    }, []);

  /* ====================================================
     FETCH SERVICE PRICING
  ==================================================== */

  const fetchServicePricing =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/service-pricing"
          );

        const categories =
          buildPricingCategories(
            response.data
          ).filter(
            (category) =>
              category.plans.length > 0
          );

        setPricingCategories(
          categories
        );

        return categories;
      } catch (error) {
        console.warn(
          "Service pricing load error:",
          error
        );

        setPricingCategories([]);

        return [];
      }
    }, []);
      /* ====================================================
     LOAD DASHBOARD
  ==================================================== */

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
          fetchServicePricing(),
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
      fetchServicePricing,
    ]
  );

  /* ====================================================
     SOCKET EVENTS
  ==================================================== */

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

    const handlePricingUpdated = () => {
      fetchServicePricing().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      handleWalletUpdated
    );

    socket.on(
      "api-key-created",
      handleApiKeyChanged
    );

    socket.on(
      "api-key-updated",
      handleApiKeyChanged
    );

    socket.on(
      "api-key-revoked",
      handleApiKeyChanged
    );

    socket.on(
      "purchase-successful",
      handleTransactionChanged
    );

    socket.on(
      "transaction-updated",
      handleTransactionChanged
    );

    socket.on(
      "api-usage-created",
      handleUsageUpdated
    );

    socket.on(
      "usage-updated",
      handleUsageUpdated
    );

    socket.on(
      "service-pricing-created",
      handlePricingUpdated
    );

    socket.on(
      "service-pricing-updated",
      handlePricingUpdated
    );

    socket.on(
      "service-pricing-deleted",
      handlePricingUpdated
    );

    socket.on(
      "service-pricing-status-changed",
      handlePricingUpdated
    );

    return () => {
      socket.off(
        "wallet-updated",
        handleWalletUpdated
      );

      socket.off(
        "api-key-created",
        handleApiKeyChanged
      );

      socket.off(
        "api-key-updated",
        handleApiKeyChanged
      );

      socket.off(
        "api-key-revoked",
        handleApiKeyChanged
      );

      socket.off(
        "purchase-successful",
        handleTransactionChanged
      );

      socket.off(
        "transaction-updated",
        handleTransactionChanged
      );

      socket.off(
        "api-usage-created",
        handleUsageUpdated
      );

      socket.off(
        "usage-updated",
        handleUsageUpdated
      );

      socket.off(
        "service-pricing-created",
        handlePricingUpdated
      );

      socket.off(
        "service-pricing-updated",
        handlePricingUpdated
      );

      socket.off(
        "service-pricing-deleted",
        handlePricingUpdated
      );

      socket.off(
        "service-pricing-status-changed",
        handlePricingUpdated
      );
    };
  }, [
    loadDashboard,
    fetchWallet,
    fetchApiKeys,
    fetchTransactions,
    fetchUsageLogs,
    fetchServicePricing,
  ]);

  /* ====================================================
     COMPUTED VALUES
  ==================================================== */

  const activeApiKeys = useMemo(
    () =>
      apiKeys.filter(
        (key) =>
          String(
            key?.status || ""
          ).toUpperCase() ===
          "ACTIVE"
      ),
    [apiKeys]
  );

  const liveKey =
    activeApiKeys[0]?.key || "";

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
            sum +
            Number(
              transaction?.amount || 0
            ),
          0
        ),
    [transactions]
  );

  const filteredPricingCategories =
    useMemo(() => {
      const search = pricingSearch
        .trim()
        .toLowerCase();

      return pricingCategories
        .map((category) => {
          const plans =
            category.plans.filter(
              (plan) => {
                const matchesTier =
                  selectedTier === "ALL" ||
                  plan.tier === selectedTier;

                const matchesSearch =
                  !search ||
                  plan.serviceName
                    .toLowerCase()
                    .includes(search) ||
                  plan.serviceCode
                    .toLowerCase()
                    .includes(search) ||
                  category.category
                    .toLowerCase()
                    .includes(search);

                return (
                  matchesTier &&
                  matchesSearch
                );
              }
            );

          return {
            ...category,
            plans,
          };
        })
        .filter(
          (category) =>
            category.plans.length > 0
        );
    }, [
      pricingCategories,
      pricingSearch,
      selectedTier,
    ]);

  const stats = [
    {
      title: "Wallet Balance",
      value: formatNaira(
        wallet?.balance || 0
      ),
      icon: <Wallet size={24} />,
    },
    {
      title: "API Calls",
      value:
        usageLogs.length.toLocaleString(
          "en-US"
        ),
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

  /* ====================================================
     ACTIONS
  ==================================================== */

  const copyApiKey = async () => {
    if (!liveKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        liveKey
      );

      setMessage(
        "API key copied successfully."
      );
    } catch {
      setMessage(
        "Unable to copy API key."
      );
    }
  };

  const togglePricingCategory = (
    category
  ) => {
    setExpandedPricing((current) => ({
      ...current,
      [category]:
        !current[category],
    }));
  };

  /* ====================================================
     UI
  ==================================================== */

  return (
    <DashboardLayout
      title="Developer Dashboard"
      description="Manage wallet, API keys, usage logs and live transactions."
    >
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>{message}</span>
        </div>
      )}

      <div className="mb-10 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            loadDashboard({
              silent: true,
            })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
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

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 bg-gradient-to-br from-blue-600/15 via-slate-900 to-slate-900 p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300">
                    <CircleDollarSign
                      size={17}
                    />

                    Ayax Live Service Prices
                  </div>

                  <h2 className="mt-4 text-2xl font-extrabold">
                    Current API Plans & Prices
                  </h2>

                  <p className="mt-3 max-w-3xl text-slate-400">
                    Prices added by the
                    administrator for Data,
                    Airtime, BVN, NIN, Cable,
                    Electricity and other
                    services.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4">
                    <p className="text-xs text-slate-500">
                      Services
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {
                        pricingCategories.length
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4">
                    <p className="text-xs text-slate-500">
                      Status
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-xl font-bold text-green-400">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />
                      LIVE
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="search"
                    value={pricingSearch}
                    onChange={(event) =>
                      setPricingSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search plans or services..."
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3.5 pl-12 pr-4 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    "ALL",
                    "REGULAR",
                    "STANDARD",
                    "PREMIUM",
                  ].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() =>
                        setSelectedTier(
                          tier
                        )
                      }
                      className={`rounded-xl px-4 py-3 text-xs font-bold ${
                        selectedTier ===
                        tier
                          ? "bg-blue-600 text-white"
                          : "border border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {filteredPricingCategories.length ===
              0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center">
                  <CircleDollarSign
                    size={42}
                    className="mx-auto text-slate-600"
                  />

                  <h3 className="mt-4 text-xl font-bold">
                    No pricing plans
                    available
                  </h3>

                  <p className="mt-2 text-slate-500">
                    Plans added by the
                    administrator will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  {filteredPricingCategories.map(
                    (category) => (
                      <ServicePriceCard
                        key={
                          category.category
                        }
                        category={
                          category
                        }
                        expanded={
                          expandedPricing[
                            category
                              .category
                          ]
                        }
                        onToggle={() =>
                          togglePricingCategory(
                            category.category
                          )
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </section>

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
                  transactions
                    .slice(0, 5)
                    .map((transaction) => {
                      const transactionStatus =
                        String(
                          transaction?.status ||
                            "PENDING"
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
                              {transaction.reference ||
                                "-"}
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
                              {formatNaira(
                                transaction.amount
                              )}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                transactionStatus ===
                                "SUCCESSFUL"
                                  ? "bg-green-500/10 text-green-400"
                                  : transactionStatus ===
                                      "FAILED"
                                    ? "bg-red-500/10 text-red-400"
                                    : transactionStatus ===
                                        "PROCESSING"
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
                <code className="text-blue-400">
                  x-api-key
                </code>
                .
              </p>

              <div className="break-all rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-300">
                {liveKey ||
                  "No active API key found"}
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
function ServicePriceCard({
  category,
  expanded,
  onToggle,
}) {
  const categoryCode = String(
    category.category || "DEFAULT"
  ).toUpperCase();

  const config =
    SERVICE_CONFIG[categoryCode] ||
    SERVICE_CONFIG.DEFAULT;

  const Icon = config.icon;

  const plans = [...category.plans].sort(
    (first, second) =>
      Number(first.sellingPrice || 0) -
      Number(second.sellingPrice || 0)
  );

  const visiblePlans = expanded
    ? plans
    : plans.slice(0, 5);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Icon size={24} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                {categoryCode}
              </p>

              <h3 className="mt-2 text-xl font-bold">
                {config.title}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {config.subtitle}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
            LIVE
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {visiblePlans.map(
            (plan, index) => (
              <div
                key={
                  plan.id ||
                  `${plan.serviceCode}-${index}`
                }
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-200">
                      {plan.serviceName}
                    </h4>

                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                      {plan.tier}
                    </span>
                  </div>

                  {getPlanFeatureText(
                    plan.features
                  ) && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {getPlanFeatureText(
                        plan.features
                      )}
                    </p>
                  )}

                  {plan.serviceCode && (
                    <p className="mt-2 truncate font-mono text-[11px] text-slate-600">
                      {plan.serviceCode}
                    </p>
                  )}
                </div>

                <p className="shrink-0 text-lg font-extrabold text-white">
                  {formatCompactNaira(
                    plan.sellingPrice
                  )}
                </p>
              </div>
            )
          )}
        </div>

        {plans.length > 5 && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 py-3 font-semibold text-slate-300 hover:bg-slate-800"
          >
            {expanded ? (
              <>
                <ChevronUp size={17} />
                Show fewer plans
              </>
            ) : (
              <>
                <ChevronDown size={17} />
                View all {plans.length} plans
              </>
            )}
          </button>
        )}

        <Link
          href={config.href}
          className="mt-5 flex items-center justify-end gap-2 border-t border-slate-800 pt-5 text-sm font-semibold text-blue-400 hover:text-blue-300"
        >
          Open service
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function getPlanFeatureText(features) {
  if (
    !features ||
    typeof features !== "object"
  ) {
    return "";
  }

  const preferredKeys = [
    "network",
    "dataSize",
    "validity",
    "provider",
    "package",
    "delivery",
    "responseFormat",
    "discount",
    "description",
  ];

  return preferredKeys
    .filter(
      (key) =>
        features[key] !== undefined &&
        features[key] !== null &&
        String(features[key]).trim() !== ""
    )
    .map((key) =>
      String(features[key])
    )
    .slice(0, 4)
    .join(" • ");
}