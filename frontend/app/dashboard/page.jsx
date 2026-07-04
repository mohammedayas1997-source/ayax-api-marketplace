"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  KeyRound,
  Activity,
  BarChart3,
  ArrowUpRight,
  Copy,
  PlusCircle,
} from "lucide-react";

import { socket } from "@/lib/socket";
import api from "@/lib/api";
import DashboardLayout from "@/components/layouts/DashboardLayout";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function DashboardPage() {
  const [wallet, setWallet] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    const res = await api.get("/wallet");
    setWallet(res.data.wallet);
  };

  const fetchApiKeys = async () => {
    const res = await api.get("/api-keys");
    setApiKeys(res.data.keys || []);
  };

  const fetchTransactions = async () => {
    const res = await api.get("/wallet/transactions");
    setTransactions(res.data.transactions || []);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchApiKeys(), fetchTransactions()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    socket.connect();
    socket.on("wallet-updated", fetchWallet);
    socket.on("api-key-created", fetchApiKeys);
    socket.on("purchase-successful", fetchTransactions);

    return () => {
      socket.off("wallet-updated", fetchWallet);
      socket.off("api-key-created", fetchApiKeys);
      socket.off("purchase-successful", fetchTransactions);
      socket.disconnect();
    };
  }, []);

  const liveKey = apiKeys?.[0]?.key || "";

  const stats = [
    {
      title: "Wallet Balance",
      value: formatNaira(wallet?.balance || 0),
      icon: <Wallet size={24} />,
    },
    {
      title: "API Calls",
      value: "0",
      icon: <Activity size={24} />,
    },
    {
      title: "Active API Keys",
      value: apiKeys.filter((k) => k.status === "ACTIVE").length,
      icon: <KeyRound size={24} />,
    },
    {
      title: "Total Spend",
      value: formatNaira(
        transactions
          .filter((t) => t.type === "DEBIT")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      ),
      icon: <BarChart3 size={24} />,
    },
  ];

  return (
    <DashboardLayout
      title="Developer Dashboard"
      description="Manage wallet, API keys, usage logs and live transactions."
    >
      <div className="mb-10 flex justify-end">
        <Link
          href="/dashboard/wallet"
          className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
        >
          <PlusCircle size={18} />
          Fund Wallet
        </Link>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((item) => (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <ArrowUpRight size={18} className="text-slate-500" />
                </div>

                <p className="text-slate-400 mt-5">{item.title}</p>
                <h2 className="text-3xl font-extrabold mt-2">{item.value}</h2>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Recent Transactions</h2>

              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-slate-500">No transactions yet.</p>
                ) : (
                  transactions.slice(0, 5).map((trx) => (
                    <div
                      key={trx.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <h3 className="font-semibold">
                          {trx.service || trx.description || "Transaction"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {trx.reference}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold">
                          {formatNaira(trx.amount)}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            trx.status === "SUCCESSFUL"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {trx.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Live API Key</h2>

              <p className="text-slate-400 text-sm mb-4">
                Use this key in your request header as x-api-key.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-slate-300 break-all">
                {liveKey || "No API key found"}
              </div>

              <button
                onClick={() => navigator.clipboard.writeText(liveKey)}
                disabled={!liveKey}
                className="mt-5 w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                Copy API Key
              </button>

              <Link
                href="/dashboard/api-keys"
                className="mt-4 block text-center text-blue-400 font-semibold"
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