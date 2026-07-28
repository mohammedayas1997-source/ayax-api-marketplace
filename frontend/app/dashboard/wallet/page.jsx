"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

const QUICK_AMOUNTS = [5000, 10000, 50000];

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getStatusClasses = (status) => {
  const normalizedStatus = String(status || "").toUpperCase();

  if (
    normalizedStatus === "SUCCESSFUL" ||
    normalizedStatus === "APPROVED" ||
    normalizedStatus === "COMPLETED"
  ) {
    return "bg-green-500/10 text-green-400";
  }

  if (
    normalizedStatus === "FAILED" ||
    normalizedStatus === "REJECTED" ||
    normalizedStatus === "CANCELLED"
  ) {
    return "bg-red-500/10 text-red-400";
  }

  if (normalizedStatus === "PROCESSING") {
    return "bg-blue-500/10 text-blue-400";
  }

  return "bg-yellow-500/10 text-yellow-400";
};

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const socket = useSocket();
  const connected = Boolean(socket?.connected);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("BANK_TRANSFER");

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

        setMessage("");

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
    loadWalletPage();
  }, [loadWalletPage]);

  useEffect(() => {
    if (!socket || !connected) {
      return undefined;
    }

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

    const handleTransactionUpdated = () => {
      refreshWallet();
    };

    const handlePurchaseSuccessful = () => {
      refreshWallet();
    };

    socket.on("wallet:updated", handleWalletUpdated);
    socket.on("funding-approved", handleFundingApproved);
    socket.on("funding-rejected", handleFundingRejected);
    socket.on("transaction-updated", handleTransactionUpdated);
    socket.on("purchase-successful", handlePurchaseSuccessful);

    return () => {
      socket.off("wallet:updated", handleWalletUpdated);
      socket.off("funding-approved", handleFundingApproved);
      socket.off("funding-rejected", handleFundingRejected);
      socket.off("transaction-updated", handleTransactionUpdated);
      socket.off("purchase-successful", handlePurchaseSuccessful);
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
      {
        totalCredit: 0,
        totalDebit: 0,
      }
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
    setChannel("BANK_TRANSFER");
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

      const response = await api.post("/wallet/funding", {
        amount: numericAmount,
        channel,
      });

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Wallet funding request created successfully."
      );

      setFundModalOpen(false);
      setAmount("");
      setChannel("BANK_TRANSFER");

      await loadWalletPage({ silent: true });
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to create wallet funding request."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Wallet"
      description="Fund your wallet and monitor all API deductions."
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
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
          )}

          <span>{message}</span>
        </div>
      )}

      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-end">
        <button
          type="button"
          onClick={() => loadWalletPage({ silent: true })}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Fund Wallet
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle size={22} className="animate-spin" />
            Loading wallet information...
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-blue-500 bg-gradient-to-br from-blue-600 to-slate-900 p-8 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Wallet size={32} />
                <span className="font-semibold">
                  Available Balance
                </span>
              </div>

              <h2 className="mt-8 break-all text-4xl font-extrabold sm:text-5xl">
                {formatNaira(wallet?.balance)}
              </h2>

              <p className="mt-4 text-blue-100">
                This balance is automatically deducted when your API
                requests are processed.
              </p>

              {wallet?.updatedAt && (
                <p className="mt-5 text-xs text-blue-200/70">
                  Last updated:{" "}
                  {new Date(wallet.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-5 text-xl font-bold">
                Quick Funding
              </h3>

              <div className="space-y-3">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => openFundingModal(quickAmount)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 font-semibold hover:border-blue-500"
                  >
                    {formatNaira(quickAmount)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setChannel("CARD");
                  openFundingModal();
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
              >
                <CreditCard size={18} />
                Fund Wallet
              </button>
            </div>
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-2">
            <SummaryCard
              title="Total Credit"
              value={formatNaira(totals.totalCredit)}
              type="credit"
            />

            <SummaryCard
              title="Total Debit"
              value={formatNaira(totals.totalDebit)}
              type="debit"
            />
          </section>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">
              Wallet History
            </h2>

            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                  No wallet transactions yet.
                </div>
              ) : (
                transactions.map((item) => {
                  const type = String(
                    item?.type || "DEBIT"
                  ).toUpperCase();

                  const status = String(
                    item?.status ||
                      (type === "CREDIT" || type === "REFUND" || type === "REVERSAL"
                        ? "SUCCESSFUL"
                        : "COMPLETED")
                  ).toUpperCase();

                  const isCredit = type === "CREDIT";

                  return (
                    <div
                      key={item.id || item.reference}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
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
                          <h3 className="font-semibold">
                            {item.description ||
                              item.service ||
                              (isCredit
                                ? "Wallet Credit"
                                : "Wallet Debit")}
                          </h3>

                          <p className="text-sm text-slate-500">
                            {item.reference || "-"}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {item.createdAt
                              ? new Date(
                                  item.createdAt
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <span
                          className={`font-bold ${
                            isCredit
                              ? "text-green-400"
                              : "text-slate-100"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatNaira(item.amount)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${getStatusClasses(
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Fund Wallet
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Enter the amount you want to add to your wallet.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFundingModal}
                disabled={submitting}
                className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={submitFundingRequest}
              className="space-y-5"
            >
              <div>
                <label className="text-sm text-slate-400">
                  Amount
                </label>

                <input
                  type="number"
                  min="100"
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="5000"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-lg outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Funding Method
                </label>

                <select
                  value={channel}
                  onChange={(event) =>
                    setChannel(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
                >
                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>
                  <option value="CARD">
                    Debit Card
                  </option>
                  <option value="MANUAL">
                    Manual Funding
                  </option>
                </select>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                Requested amount:{" "}
                <strong>{formatNaira(amount)}</strong>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Continue Funding
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

function SummaryCard({ title, value, type }) {
  const isCredit = type === "credit";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isCredit
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft size={22} />
          ) : (
            <ArrowUpRight size={22} />
          )}
        </div>

        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-1 text-2xl font-bold">{value}</h3>
        </div>
      </div>
    </div>
  );
}