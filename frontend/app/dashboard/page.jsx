"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RefreshCcw,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

const QUICK_AMOUNTS = [1000, 5000, 10000, 50000, 100000];

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getStatusClasses = (status) => {
  const normalizedStatus = String(status || "").toUpperCase();

  if (
    normalizedStatus === "SUCCESSFUL" ||
    normalizedStatus === "APPROVED" ||
    normalizedStatus === "COMPLETED"
  ) {
    return "bg-green-500/10 text-green-400 border border-green-500/20";
  }

  if (
    normalizedStatus === "FAILED" ||
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "CANCELLED"
  ) {
    return "bg-red-500/10 text-red-400 border border-red-500/20";
  }

  if (normalizedStatus === "PROCESSING") {
    return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
  }

  return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
};

export default function WalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentReference = searchParams.get("reference");

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const socket = useSocket();
  const connected = Boolean(socket?.connected);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

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
    const response = await api.get("/wallet/transactions");
    const list =
      response.data?.transactions ||
      response.data?.data?.transactions ||
      response.data?.data ||
      [];

    setTransactions(Array.isArray(list) ? list : []);
    return list;
  }, []);

  const loadWalletPage = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const results = await Promise.allSettled([
          fetchWallet(),
          fetchTransactions(),
        ]);

        const failedResult = results.find(
          (result) => result.status === "rejected"
        );

        if (failedResult) {
          setMessageType("error");
          setMessage(
            getErrorMessage(
              failedResult.reason,
              "Some wallet information could not be loaded."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWallet, fetchTransactions]
  );

  useEffect(() => {
    if (!paymentReference) return;

    const verifyPayment = async () => {
      try {
        setVerifying(true);
        setMessageType("info");
        setMessage("Verifying your payment, please wait...");

        const response = await api.get(
          `/wallet/paystack/verify/${paymentReference}`
        );

        setMessageType("success");
        setMessage(response.data?.message || "Wallet funded successfully!");

        router.replace("/dashboard/wallet", { scroll: false });
        await loadWalletPage({ silent: true });
      } catch (error) {
        setMessageType("error");
        setMessage(getErrorMessage(error, "Payment verification failed."));
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentReference, router, loadWalletPage]);

  useEffect(() => {
    loadWalletPage();
  }, [loadWalletPage]);

  useEffect(() => {
    if (!socket || !connected) return undefined;

    const refreshWallet = () => {
      loadWalletPage({ silent: true }).catch((error) => {
        console.error("Real-time wallet refresh error:", error);
      });
    };

    const handleWalletUpdated = (payload) => {
      if (payload?.balance !== undefined) {
        setWallet((currentWallet) => ({
          ...(currentWallet || {}),
          balance: Number(payload.balance || 0),
          updatedAt: payload.updatedAt || new Date().toISOString(),
        }));
      }
      refreshWallet();
    };

    const handleFundingApproved = () => {
      setMessageType("success");
      setMessage("Your wallet funding has been approved.");
      refreshWallet();
    };

    const handleFundingRejected = (payload) => {
      setMessageType("error");
      setMessage(
        payload?.message ||
          payload?.reason ||
          "Your wallet funding request was rejected."
      );
      refreshWallet();
    };

    socket.on("wallet:updated", handleWalletUpdated);
    socket.on("funding-approved", handleFundingApproved);
    socket.on("funding-rejected", handleFundingRejected);
    socket.on("transaction-updated", refreshWallet);
    socket.on("purchase-successful", refreshWallet);

    return () => {
      socket.off("wallet:updated", handleWalletUpdated);
      socket.off("funding-approved", handleFundingApproved);
      socket.off("funding-rejected", handleFundingRejected);
      socket.off("transaction-updated", refreshWallet);
      socket.off("purchase-successful", refreshWallet);
    };
  }, [socket, connected, loadWalletPage]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        const type = String(transaction?.type || "").toUpperCase();
        const transactionAmount = Number(transaction?.amount || 0);

        if (["CREDIT", "REFUND", "REVERSAL"].includes(type)) {
          result.totalCredit += transactionAmount;
        }

        if (["DEBIT", "ADJUSTMENT"].includes(type)) {
          result.totalDebit += transactionAmount;
        }

        return result;
      },
      { totalCredit: 0, totalDebit: 0 }
    );
  }, [transactions]);

  const openFundingModal = (selectedAmount = "") => {
    setAmount(selectedAmount ? String(selectedAmount) : "");
    setMessage("");
    setFundModalOpen(true);
  };

  const closeFundingModal = () => {
    if (submitting) return;
    setFundModalOpen(false);
    setAmount("");
  };

  const submitFundingRequest = async (event) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 100) {
      setMessageType("error");
      setMessage("Enter a valid funding amount of at least ₦100.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await api.post("/wallet/paystack/initialize", {
        amount: numericAmount,
      });

      const authUrl =
        response.data?.authorizationUrl ||
        response.data?.authorization_url ||
        response.data?.data?.authorizationUrl ||
        response.data?.data?.authorization_url;

      if (authUrl) {
        window.location.href = authUrl;
        return;
      }

      throw new Error("Could not retrieve payment authorization URL.");
    } catch (error) {
      setFundModalOpen(false);
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to initialize payment. Please try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Wallet"
      description="Fund your wallet securely and monitor all API or service deductions."
    >
      {(message || verifying) && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : messageType === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {verifying || messageType === "info" ? (
            <LoaderCircle size={20} className="mt-0.5 shrink-0 animate-spin" />
          ) : messageType === "success" ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => loadWalletPage({ silent: true })}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
        >
          <RefreshCcw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

        <button
          type="button"
          onClick={() => openFundingModal()}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
        >
          <PlusCircle size={18} />
          Fund Wallet
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle size={22} className="animate-spin text-blue-500" />
            Loading wallet information...
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 p-8 lg:col-span-2 shadow-xl shadow-blue-950/40 relative overflow-hidden">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
                <Wallet size={200} />
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <Wallet size={28} />
                <span className="font-medium uppercase tracking-wider text-sm">
                  Available Balance
                </span>
              </div>

              <h2 className="mt-6 break-all text-4xl font-extrabold text-white sm:text-5xl">
                {formatNaira(wallet?.balance)}
              </h2>

              <p className="mt-4 text-blue-100/90 max-w-xl text-sm sm:text-base leading-relaxed">
                Your wallet balance is automatically debited when processing API
                requests or automated service executions.
              </p>

              {wallet?.updatedAt && (
                <p className="mt-6 text-xs text-blue-200/70">
                  Last updated:{" "}
                  {new Date(wallet.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Quick Funding
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Choose a preset amount for quick deposit:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {QUICK_AMOUNTS.slice(0, 4).map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => openFundingModal(quickAmount)}
                      className="rounded-xl border border-slate-800 bg-slate-950 py-3 px-3 font-semibold text-slate-200 hover:border-blue-500 hover:bg-slate-900 transition-all text-sm"
                    >
                      {formatNaira(quickAmount)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openFundingModal()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20"
              >
                <CreditCard size={18} />
                Fund via Paystack
              </button>
            </div>
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Credit</p>
                <h3 className="mt-2 text-2xl font-bold text-green-400">
                  {formatNaira(totals.totalCredit)}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                <ArrowDownLeft size={24} />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Debit</p>
                <h3 className="mt-2 text-2xl font-bold text-red-400">
                  {formatNaira(totals.totalDebit)}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <ArrowUpRight size={24} />
              </div>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold text-white">
              Wallet History
            </h2>

            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                  No wallet transactions yet.
                </div>
              ) : (
                transactions.map((item) => {
                  const type = String(item?.type || "DEBIT").toUpperCase();
                  const status = String(
                    item?.status ||
                      (["CREDIT", "REFUND", "REVERSAL"].includes(type)
                        ? "SUCCESSFUL"
                        : "COMPLETED")
                  ).toUpperCase();

                  const isCredit = type === "CREDIT";

                  return (
                    <div
                      key={item.id || item.reference}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between transition-all hover:border-slate-700"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isCredit
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={20} />
                          ) : (
                            <ArrowUpRight size={20} />
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold text-white">
                            {item.description ||
                              item.service ||
                              (isCredit ? "Wallet Credit" : "Wallet Debit")}
                          </h3>

                          <p className="text-sm text-slate-400">
                            {item.reference || "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
                        <span
                          className={`font-bold text-base ${
                            isCredit ? "text-green-400" : "text-white"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatNaira(item.amount)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {fundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Fund Wallet</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter amount to proceed with Paystack.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFundingModal}
                disabled={submitting}
                className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitFundingRequest} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="10,000"
                    required
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-4 text-xl font-bold text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.slice(0, 3).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      Number(amount) === preset
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    +{formatNaira(preset)}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex items-center justify-between text-sm text-blue-200">
                <span>Total Payable:</span>
                <strong className="text-base text-white">
                  {formatNaira(amount)}
                </strong>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 transition-all shadow-lg shadow-blue-600/20"
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Initializing Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Proceed to Payment
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