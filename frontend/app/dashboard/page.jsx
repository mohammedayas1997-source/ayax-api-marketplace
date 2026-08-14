"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Bot,
  Send,
  Sparkles,
  Trash2,
  User,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { useSocket } from "@/context/SocketContext";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

  // --- AI ASSISTANT STATES ---
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello 👋 I am AYAX AI. I can help you with information about your wallet, funding, AYAX APIs, and services.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [previousResponseId, setPreviousResponseId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (aiOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, aiLoading, aiOpen]);

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          previousResponseId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to contact AYAX AI.");
      }

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.data?.response || "I could not generate a response.",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (result.data?.responseId) {
        setPreviousResponseId(result.data.responseId);
      }
    } catch (error) {
      console.error("AYAX AI frontend error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          content: error?.message || "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleAiKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAiMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content: "Chat cleared 👋 How can I help you with your wallet today?",
      },
    ]);
    setPreviousResponseId(null);
  };

  const copyMessage = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };
  // ---------------------------

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

      {/* --- FLOATING AI ASSISTANT WIDGET --- */}
      <div className="fixed bottom-6 right-6 z-40">
        {!aiOpen && (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-3 rounded-full bg-blue-600 px-5 py-4 text-white shadow-2xl shadow-blue-600/40 transition hover:bg-blue-500 hover:scale-105"
          >
            <Bot size={22} />
            <span className="font-semibold text-sm">Ask AYAX AI</span>
          </button>
        )}

        {aiOpen && (
          <div className="flex flex-col h-[520px] w-[92vw] sm:w-[400px] rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    AYAX AI
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-semibold text-green-400">
                      ONLINE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Wallet & Services Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear Chat"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setAiOpen(false)}
                  title="Close"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const isError = message.role === "error";

                return (
                  <div
                    key={message.id}
                    className={`flex gap-2.5 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isError
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {isError ? <AlertCircle size={14} /> : <Bot size={14} />}
                      </div>
                    )}

                    <div
                      className={`group max-w-[85%] ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-6 ${
                          isUser
                            ? "rounded-br-sm bg-blue-600 text-white"
                            : isError
                            ? "rounded-bl-sm border border-red-500/20 bg-red-500/10 text-red-300"
                            : "rounded-bl-sm border border-slate-800 bg-slate-950 text-slate-200"
                        }`}
                      >
                        {message.content}
                      </div>

                      {!isUser && !isError && (
                        <button
                          type="button"
                          onClick={() => copyMessage(message.content, message.id)}
                          className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-slate-300"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check size={11} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isUser && (
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-200">
                        <User size={14} />
                      </div>
                    )}
                  </div>
                );
              })}

              {aiLoading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Bot size={14} />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-950 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="border-t border-slate-800 px-3 py-2 bg-slate-950/40">
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  "How do I fund my wallet?",
                  "Check my balance status",
                  "What APIs are available?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={aiLoading}
                    onClick={() => {
                      setAiInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 transition hover:border-blue-500 hover:text-blue-400 disabled:opacity-50"
                  >
                    <Sparkles size={11} />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <div className="border-t border-slate-800 p-3 bg-slate-950">
              <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-900 p-1.5 focus-within:border-blue-500 transition">
                <textarea
                  ref={textareaRef}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={handleAiKeyDown}
                  disabled={aiLoading}
                  rows={1}
                  placeholder="Ask AYAX AI..."
                  className="max-h-24 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={sendAiMessage}
                  disabled={aiLoading || !aiInput.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ title, value, type }) {
  const isCredit = type === "credit";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            isCredit
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {isCredit ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
        </div>

        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
        </div>
      </div>
    </div>
  );
}