"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Smartphone,
  Phone,
  CheckCircle,
  X,
  ShoppingCart,
  Wallet,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";
import { socket } from "@/lib/socket";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const networks = [
  { id: "MTN", name: "MTN", discount: 2 },
  { id: "AIRTEL", name: "Airtel", discount: 2 },
  { id: "GLO", name: "Glo", discount: 2 },
  { id: "9MOBILE", name: "9mobile", discount: 2 },
];

const quickAmounts = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
];

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export default function AirtimeMarketplacePage() {
  const [wallet, setWallet] = useState(null);

  const [selectedNetwork, setSelectedNetwork] =
    useState(null);

  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [purchasing, setPurchasing] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

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

        await fetchWallet();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load wallet information."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWallet]
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
    };
  }, [loadPage, fetchWallet]);

  const openPurchaseModal = (network) => {
    setSelectedNetwork(network);
    setPhone("");
    setAmount("");
    setMessage("");
  };

  const closePurchaseModal = () => {
    if (purchasing) return;

    setSelectedNetwork(null);
    setPhone("");
    setAmount("");
  };

  const confirmPurchase = async (event) => {
    event.preventDefault();

    if (!selectedNetwork) return;

    const cleanPhone = phone
      .replace(/\s+/g, "")
      .trim();

    const numericAmount = Number(amount);

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

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 50
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid airtime amount of at least ₦50."
      );
      return;
    }

    if (
      Number(wallet?.balance || 0) <
      numericAmount
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
        "/airtime/buy",
        {
          network: selectedNetwork.id,
          phoneNumber: cleanPhone,
          amount: numericAmount,
        }
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Airtime purchase submitted successfully."
      );

      setSelectedNetwork(null);
      setPhone("");
      setAmount("");

      await fetchWallet();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Airtime purchase failed."
        )
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <DashboardLayout
      title="Buy Airtime"
      description="Purchase airtime for MTN, Airtel, Glo and 9mobile directly from your wallet."
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

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading airtime marketplace...
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {networks.map((network) => (
            <div
              key={network.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                  <Smartphone size={24} />
                </div>

                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                  ACTIVE
                </span>
              </div>

              <h2 className="text-2xl font-extrabold">
                {network.name}
              </h2>

              <p className="mt-1 text-slate-400">
                Airtime Recharge
              </p>

              <div className="mt-6">
                <p className="text-sm text-slate-400">
                  Developer Discount
                </p>

                <h3 className="mt-1 text-3xl font-extrabold">
                  {network.discount}%
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  openPurchaseModal(network)
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
              >
                <ShoppingCart size={18} />
                Buy Airtime
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedNetwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Confirm Airtime Purchase
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
                value={selectedNetwork.name}
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
                      setPhone(event.target.value)
                    }
                    placeholder="08012345678"
                    required
                    className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Amount
                </label>

                <input
                  type="number"
                  min="50"
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="Enter amount"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {quickAmounts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setAmount(String(item))
                    }
                    className="rounded-xl bg-slate-800 py-3 text-sm hover:bg-slate-700"
                  >
                    {formatNaira(item)}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm text-blue-200">
                  Purchase Amount
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatNaira(amount)}
                </p>
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