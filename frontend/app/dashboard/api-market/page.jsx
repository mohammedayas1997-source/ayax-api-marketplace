"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ShoppingCart,
  Wifi,
  Smartphone,
  Wallet,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  Search,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeCategory = (value) =>
  String(value || "DATA")
    .trim()
    .toUpperCase();

const getPlanPrice = (plan) =>
  Number(
    plan?.sellingPrice ??
      plan?.price ??
      plan?.amount ??
      0
  );

export default function CustomerApiMarketPage() {
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [provider, setProvider] = useState("ALL");

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchPlans = useCallback(async () => {
    const possibleRoutes = [
      "/marketplace/plans",
      "/api-marketplace/plans",
      "/plans",
      "/data-plans",
    ];

    let lastError = null;

    for (const route of possibleRoutes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.plans ||
          response.data?.dataPlans ||
          response.data?.products ||
          response.data?.services ||
          response.data?.data?.plans ||
          response.data?.data ||
          [];

        const activePlans = Array.isArray(list)
          ? list.filter((plan) => {
              const status = String(
                plan?.status || "ACTIVE"
              ).toUpperCase();

              return status === "ACTIVE";
            })
          : [];

        setPlans(activePlans);

        return activePlans;
      } catch (error) {
        lastError = error;

        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw (
      lastError ||
      new Error("Plans endpoint was not found.")
    );
  }, []);

  const fetchWallet = useCallback(async () => {
    const response = await api.get("/wallet");

    const walletData =
      response.data?.wallet ||
      response.data?.data?.wallet ||
      response.data?.data ||
      null;

    setWallet(walletData);

    return walletData;
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

  const loadMarketplace = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        const results = await Promise.allSettled([
          fetchPlans(),
          fetchWallet(),
          fetchTransactions(),
        ]);

        const failed = results.find(
          (result) => result.status === "rejected"
        );

        if (failed) {
          setMessageType("error");
          setMessage(
            getErrorMessage(
              failed.reason,
              "Some marketplace information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchPlans,
      fetchWallet,
      fetchTransactions,
    ]
  );

  useEffect(() => {
    loadMarketplace();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshWalletAndHistory = () => {
      fetchWallet().catch(console.error);
      fetchTransactions().catch(console.error);
    };

    const refreshPlans = () => {
      fetchPlans().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWalletAndHistory
    );

    socket.on(
      "transaction-updated",
      refreshWalletAndHistory
    );

    socket.on(
      "purchase-successful",
      refreshWalletAndHistory
    );

    socket.on(
      "purchase-failed",
      refreshWalletAndHistory
    );

    socket.on("data-plan-created", refreshPlans);
    socket.on("data-plan-updated", refreshPlans);
    socket.on("data-plan-deleted", refreshPlans);
    socket.on("marketplace-updated", refreshPlans);

    return () => {
      socket.off(
        "wallet-updated",
        refreshWalletAndHistory
      );

      socket.off(
        "transaction-updated",
        refreshWalletAndHistory
      );

      socket.off(
        "purchase-successful",
        refreshWalletAndHistory
      );

      socket.off(
        "purchase-failed",
        refreshWalletAndHistory
      );

      socket.off(
        "data-plan-created",
        refreshPlans
      );

      socket.off(
        "data-plan-updated",
        refreshPlans
      );

      socket.off(
        "data-plan-deleted",
        refreshPlans
      );

      socket.off(
        "marketplace-updated",
        refreshPlans
      );
    };
  }, [
    loadMarketplace,
    fetchPlans,
    fetchWallet,
    fetchTransactions,
  ]);

  const providers = useMemo(() => {
    const values = plans
      .map((plan) =>
        String(
          plan?.provider?.name ||
            plan?.provider ||
            plan?.network ||
            ""
        )
          .trim()
          .toUpperCase()
      )
      .filter(Boolean);

    return [...new Set(values)];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();

    return plans.filter((plan) => {
      const planCategory = normalizeCategory(
        plan?.category ||
          plan?.serviceType ||
          plan?.type
      );

      const planProvider = String(
        plan?.provider?.name ||
          plan?.provider ||
          plan?.network ||
          ""
      )
        .trim()
        .toUpperCase();

      const name = String(
        plan?.name ||
          plan?.title ||
          plan?.planName ||
          ""
      ).toLowerCase();

      const code = String(
        plan?.code ||
          plan?.planCode ||
          ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        code.includes(query) ||
        planProvider
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "ALL" ||
        planCategory === category;

      const matchesProvider =
        provider === "ALL" ||
        planProvider === provider;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesProvider
      );
    });
  }, [plans, search, category, provider]);

  const purchaseHistory = useMemo(() => {
    return transactions.filter((transaction) => {
      const service = String(
        transaction?.service ||
          transaction?.description ||
          transaction?.category ||
          ""
      ).toUpperCase();

      return (
        service.includes("DATA") ||
        service.includes("AIRTIME")
      );
    });
  }, [transactions]);

  const openPurchaseModal = (plan) => {
    setSelectedPlan(plan);
    setPhoneNumber("");
    setMessage("");
  };

  const closePurchaseModal = () => {
    if (purchasing) return;

    setSelectedPlan(null);
    setPhoneNumber("");
  };

  const submitPurchase = async (event) => {
    event.preventDefault();

    if (!selectedPlan) return;

    const cleanedPhone = phoneNumber
      .replace(/\s+/g, "")
      .trim();

    if (!/^(\+234|0)[789][01]\d{8}$/.test(cleanedPhone)) {
      setMessageType("error");
      setMessage(
        "Enter a valid Nigerian phone number."
      );
      return;
    }

    const price = getPlanPrice(selectedPlan);

    if (Number(wallet?.balance || 0) < price) {
      setMessageType("error");
      setMessage("Insufficient wallet balance.");
      return;
    }

    const planCategory = normalizeCategory(
      selectedPlan?.category ||
        selectedPlan?.serviceType ||
        selectedPlan?.type
    );

    try {
      setPurchasing(true);
      setMessage("");

      let response;

      if (planCategory === "AIRTIME") {
        response = await api.post(
          "/airtime/buy",
          {
            phoneNumber: cleanedPhone,
            amount:
              selectedPlan?.amount ||
              selectedPlan?.value ||
              price,
            network:
              selectedPlan?.provider?.name ||
              selectedPlan?.provider ||
              selectedPlan?.network,
            planId: selectedPlan.id,
          }
        );
      } else {
        response = await api.post(
          "/data/buy",
          {
            phoneNumber: cleanedPhone,
            planId:
              selectedPlan.id ||
              selectedPlan.planId,
            planCode:
              selectedPlan.code ||
              selectedPlan.planCode,
            network:
              selectedPlan?.provider?.name ||
              selectedPlan?.provider ||
              selectedPlan?.network,
          }
        );
      }

      setMessageType("success");
      setMessage(
        response.data?.message ||
          `${selectedPlan.name || "Plan"} purchase submitted successfully.`
      );

      setSelectedPlan(null);
      setPhoneNumber("");

      await Promise.allSettled([
        fetchWallet(),
        fetchTransactions(),
      ]);
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to process purchase."
        )
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <DashboardLayout
      title="API Marketplace"
      description="Purchase live data and airtime services using your wallet."
    >
      {message && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : messageType === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{message}</span>
        </div>
      )}

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() =>
            loadMarketplace({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-60"
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
            Loading marketplace...
          </div>
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              title="Wallet Balance"
              value={formatNaira(wallet?.balance)}
            />

            <Stat
              title="Available Plans"
              value={plans.length}
            />

            <Stat
              title="Purchases"
              value={purchaseHistory.length}
            />

            <Stat
              title="Status"
              value="Live"
            />
          </section>

          <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                <Search
                  size={18}
                  className="text-slate-500"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search plans or providers..."
                  className="w-full bg-transparent py-4 outline-none"
                />
              </div>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
              >
                <option value="ALL">
                  All Categories
                </option>
                <option value="DATA">
                  Data
                </option>
                <option value="AIRTIME">
                  Airtime
                </option>
              </select>

              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value)
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
              >
                <option value="ALL">
                  All Providers
                </option>

                {providers.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {filteredPlans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <ShoppingCart
                size={42}
                className="mx-auto text-slate-600"
              />

              <h2 className="mt-5 text-xl font-bold">
                No plans found
              </h2>

              <p className="mt-2 text-slate-400">
                There are currently no active plans
                matching your filters.
              </p>
            </div>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {filteredPlans.map((plan) => {
                const planCategory =
                  normalizeCategory(
                    plan?.category ||
                      plan?.serviceType ||
                      plan?.type
                  );

                const planProvider =
                  plan?.provider?.name ||
                  plan?.provider ||
                  plan?.network ||
                  "Unknown";

                return (
                  <div
                    key={
                      plan.id ||
                      plan.code ||
                      plan.name
                    }
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                      {planCategory === "DATA" ? (
                        <Wifi />
                      ) : (
                        <Smartphone />
                      )}
                    </div>

                    <h2 className="text-xl font-bold">
                      {plan.name ||
                        plan.title ||
                        "API Plan"}
                    </h2>

                    <p className="mt-2 text-slate-500">
                      {planProvider} •{" "}
                      {planCategory}
                    </p>

                    {plan.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                        {plan.description}
                      </p>
                    )}

                    <h3 className="mt-5 text-3xl font-extrabold">
                      {formatNaira(
                        getPlanPrice(plan)
                      )}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        openPurchaseModal(plan)
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
                    >
                      <ShoppingCart size={18} />
                      Buy Now
                    </button>
                  </div>
                );
              })}
            </section>
          )}

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center gap-3">
              <Wallet className="text-blue-400" />

              <h2 className="text-xl font-bold">
                Purchase History
              </h2>
            </div>

            {purchaseHistory.length === 0 ? (
              <p className="text-slate-500">
                No purchases yet.
              </p>
            ) : (
              <div className="space-y-3">
                {purchaseHistory
                  .slice(0, 10)
                  .map((item) => (
                    <div
                      key={
                        item.id ||
                        item.reference
                      }
                      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <h3 className="font-bold">
                          {item.service ||
                            item.description ||
                            "Purchase"}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {item.reference || "-"} •{" "}
                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleString()
                            : "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold">
                          {formatNaira(item.amount)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            String(
                              item.status
                            ).toUpperCase() ===
                            "SUCCESSFUL"
                              ? "bg-green-500/10 text-green-400"
                              : String(
                                  item.status
                                ).toUpperCase() ===
                                "FAILED"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {String(
                            item.status || "PENDING"
                          ).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Confirm Purchase
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedPlan.name ||
                    selectedPlan.title}
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseModal}
                disabled={purchasing}
                className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={submitPurchase}
              className="space-y-5"
            >
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">
                  Purchase Amount
                </p>

                <p className="mt-2 text-3xl font-extrabold">
                  {formatNaira(
                    getPlanPrice(selectedPlan)
                  )}
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Recipient Phone Number
                </label>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                  <Phone
                    size={18}
                    className="text-slate-500"
                  />

                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(
                        event.target.value
                      )
                    }
                    placeholder="08012345678"
                    required
                    className="w-full bg-transparent py-4 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={purchasing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {purchasing ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Confirm Purchase
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-slate-400">{title}</p>

      <h2 className="mt-2 break-all text-3xl font-extrabold">
        {value}
      </h2>
    </div>
  );
}