"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Wifi,
  ShoppingCart,
  Phone,
  X,
  CheckCircle,
  AlertCircle,
  LoaderCircle,
  RefreshCcw,
  Wallet,
} from "lucide-react";

import api from "@/lib/api";
import { socket } from "@/lib/socket";
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

const getPlanNetwork = (plan) =>
  String(
    plan?.network ||
      plan?.provider?.name ||
      plan?.provider ||
      plan?.service?.provider ||
      plan?.service?.category ||
      ""
  )
    .trim()
    .toUpperCase();

const getPlanName = (plan) =>
  plan?.size ||
  plan?.name ||
  plan?.title ||
  plan?.planName ||
  "Data Plan";

const getPlanPrice = (plan) =>
  Number(
    plan?.sellingPrice ??
      plan?.price ??
      plan?.amount ??
      0
  );

export default function DataMarketplacePage() {
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);

  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("ALL");

  const [selectedPlan, setSelectedPlan] =
    useState(null);

  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

  const fetchPlans = useCallback(async () => {
    const routes = [
      "/plans",
      "/data-plans",
      "/marketplace/plans",
      "/api-marketplace/plans",
    ];

    let lastError = null;

    for (const route of routes) {
      try {
        const response = await api.get(route);

        const list =
          response.data?.plans ||
          response.data?.dataPlans ||
          response.data?.products ||
          response.data?.data?.plans ||
          response.data?.data ||
          [];

        const activePlans = Array.isArray(list)
          ? list.filter((plan) => {
              const status = String(
                plan?.status || "ACTIVE"
              ).toUpperCase();

              const category = String(
                plan?.category ||
                  plan?.serviceType ||
                  plan?.type ||
                  plan?.service?.category ||
                  "DATA"
              ).toUpperCase();

              return (
                status === "ACTIVE" &&
                category.includes("DATA")
              );
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
      new Error("Data plans endpoint not found.")
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

  const loadPage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        const results =
          await Promise.allSettled([
            fetchPlans(),
            fetchWallet(),
          ]);

        const failed = results.find(
          (result) =>
            result.status === "rejected"
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
    [fetchPlans, fetchWallet]
  );

  useEffect(() => {
    loadPage();

    const token =
      localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshWallet = () => {
      fetchWallet().catch(console.error);
    };

    const refreshPlans = () => {
      fetchPlans().catch(console.error);
    };

    socket.on(
      "wallet-updated",
      refreshWallet
    );

    socket.on(
      "purchase-successful",
      refreshWallet
    );

    socket.on(
      "transaction-updated",
      refreshWallet
    );

    socket.on(
      "data-plan-created",
      refreshPlans
    );

    socket.on(
      "data-plan-updated",
      refreshPlans
    );

    socket.on(
      "data-plan-deleted",
      refreshPlans
    );

    return () => {
      socket.off(
        "wallet-updated",
        refreshWallet
      );

      socket.off(
        "purchase-successful",
        refreshWallet
      );

      socket.off(
        "transaction-updated",
        refreshWallet
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
    };
  }, [
    loadPage,
    fetchPlans,
    fetchWallet,
  ]);

  const availableNetworks = useMemo(() => {
    return [
      ...new Set(
        plans
          .map(getPlanNetwork)
          .filter(Boolean)
      ),
    ];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const searchText =
      query.trim().toLowerCase();

    return plans.filter((plan) => {
      const planNetwork =
        getPlanNetwork(plan);

      const planName =
        getPlanName(plan);

      const planPrice =
        getPlanPrice(plan);

      const planCode = String(
        plan?.code ||
          plan?.planCode ||
          ""
      );

      const matchesSearch =
        !searchText ||
        planNetwork
          .toLowerCase()
          .includes(searchText) ||
        planName
          .toLowerCase()
          .includes(searchText) ||
        planCode
          .toLowerCase()
          .includes(searchText) ||
        String(planPrice).includes(searchText);

      const matchesNetwork =
        network === "ALL" ||
        planNetwork === network;

      return (
        matchesSearch && matchesNetwork
      );
    });
  }, [plans, query, network]);

  const openPurchaseModal = (plan) => {
    setSelectedPlan(plan);
    setPhone("");
    setMessage("");
  };

  const closePurchaseModal = () => {
    if (purchasing) return;

    setSelectedPlan(null);
    setPhone("");
  };

  const confirmPurchase = async (event) => {
    event.preventDefault();

    if (!selectedPlan) return;

    const cleanPhone = phone
      .replace(/\s+/g, "")
      .trim();

    if (
      !/^(\+234|0)[789][01]\d{8}$/.test(
        cleanPhone
      )
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid Nigerian phone number."
      );
      return;
    }

    const price =
      getPlanPrice(selectedPlan);

    if (
      Number(wallet?.balance || 0) <
      price
    ) {
      setMessageType("error");
      setMessage(
        "Insufficient wallet balance."
      );
      return;
    }

    try {
      setPurchasing(true);
      setMessage("");

      const response = await api.post(
        "/data/buy",
        {
          phoneNumber: cleanPhone,

          planId:
            selectedPlan.id ||
            selectedPlan.planId,

          planCode:
            selectedPlan.code ||
            selectedPlan.planCode,

          network:
            getPlanNetwork(selectedPlan),

          amount: price,
        }
      );

      setMessageType("success");

      setMessage(
        response.data?.message ||
          "Data purchase submitted successfully."
      );

      setSelectedPlan(null);
      setPhone("");

      await fetchWallet();
    } catch (error) {
      setMessageType("error");

      setMessage(
        getErrorMessage(
          error,
          "Unable to process data purchase."
        )
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <DashboardLayout
      title="Buy Data Plans"
      description="Browse and purchase available data plans using your wallet."
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
            <CheckCircle
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

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3">
          <Wallet
            size={20}
            className="text-blue-400"
          />

          <div>
            <p className="text-xs text-slate-400">
              Wallet Balance
            </p>

            <p className="font-bold">
              {formatNaira(wallet?.balance)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadPage({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-60"
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
      </div>

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search network, plan or price..."
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            />
          </div>

          <select
            value={network}
            onChange={(event) =>
              setNetwork(event.target.value)
            }
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="ALL">
              All Networks
            </option>

            {availableNetworks.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading data plans...
          </div>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Wifi
            size={42}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No data plans found
          </h2>

          <p className="mt-2 text-slate-400">
            No active data plan matches
            your search or network filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredPlans.map((plan) => {
            const planNetwork =
              getPlanNetwork(plan);

            const planName =
              getPlanName(plan);

            const planPrice =
              getPlanPrice(plan);

            const planStatus = String(
              plan?.status || "ACTIVE"
            ).toUpperCase();

            return (
              <div
                key={
                  plan.id ||
                  plan.code ||
                  planName
                }
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                    <Wifi size={24} />
                  </div>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                    {planStatus}
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold">
                  {planNetwork || "DATA"}
                </h2>

                <p className="mt-1 text-slate-400">
                  Data Bundle
                </p>

                <div className="mt-6">
                  <p className="text-sm text-slate-400">
                    Plan
                  </p>

                  <h3 className="mt-1 text-3xl font-extrabold">
                    {planName}
                  </h3>
                </div>

                <div className="mt-5">
                  <p className="text-sm text-slate-400">
                    Price
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-blue-400">
                    {formatNaira(planPrice)}
                  </h3>
                </div>

                {plan.validity && (
                  <p className="mt-3 text-sm text-slate-500">
                    Validity: {plan.validity}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    openPurchaseModal(plan)
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
                >
                  <ShoppingCart size={18} />
                  Buy Plan
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Confirm Data Purchase
              </h2>

              <button
                type="button"
                onClick={closePurchaseModal}
                disabled={purchasing}
                className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={confirmPurchase}
              className="space-y-4"
            >
              <ReadOnly
                label="Network"
                value={getPlanNetwork(
                  selectedPlan
                )}
              />

              <ReadOnly
                label="Plan"
                value={getPlanName(
                  selectedPlan
                )}
              />

              <ReadOnly
                label="Amount"
                value={formatNaira(
                  getPlanPrice(selectedPlan)
                )}
              />

              <div>
                <label className="text-sm text-slate-400">
                  Phone Number
                </label>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                  <Phone
                    size={18}
                    className="text-slate-500"
                  />

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="08012345678"
                    required
                    className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={purchasing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 font-semibold hover:bg-green-700 disabled:opacity-50"
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
                    <CheckCircle size={18} />
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

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value || ""}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}