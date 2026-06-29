"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCcw,
  Download,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import Filters from "../../components/Filters";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString("en-US")}`;

export default function WalletLedgerPage() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [message, setMessage] = useState("");

  const loadLedger = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wallet/ledger", {
        params: { type },
      });

      setLedger(res.data.ledger || []);
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to load wallet ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [type]);

  const filteredLedger = ledger.filter((item) => {
    const q = search.toLowerCase();

    return (
      item.reference?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.module?.toLowerCase().includes(q) ||
      item.user?.name?.toLowerCase().includes(q) ||
      item.user?.email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: ledger.length,
    credit: ledger.filter((x) => x.type === "CREDIT").length,
    debit: ledger.filter((x) => x.type === "DEBIT").length,
    adjustment: ledger.filter((x) => x.type === "ADJUSTMENT").length,
  };

  const columns = [
    {
      key: "user",
      label: "User",
      render: (row) => (
        <div>
          <p className="font-bold">{row.user?.name || "-"}</p>
          <p className="text-xs text-slate-500">{row.user?.email || "-"}</p>
        </div>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      render: (row) => (
        <span className="font-mono text-blue-400 text-xs">{row.reference}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span
          className={`font-bold ${
            row.type === "CREDIT" || row.type === "REFUND"
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      key: "balanceBefore",
      label: "Before",
      render: (row) => formatMoney(row.balanceBefore),
    },
    {
      key: "balanceAfter",
      label: "After",
      render: (row) => formatMoney(row.balanceAfter),
    },
    {
      key: "module",
      label: "Module",
      render: (row) => row.module || "-",
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleString() : "-",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Wallet Ledger">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Wallet Ledger"
      description="Track every wallet credit, debit, refund, reversal and adjustment."
    >
      {message && (
        <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 p-4">
          {message}
        </div>
      )}

      <div className="mb-8">
        <KpiGrid
          items={[
            {
              title: "Total Records",
              value: stats.total,
              icon: <BookOpen />,
              color: "blue",
            },
            {
              title: "Credit Entries",
              value: stats.credit,
              icon: <ArrowDownCircle />,
              color: "green",
            },
            {
              title: "Debit Entries",
              value: stats.debit,
              icon: <ArrowUpCircle />,
              color: "red",
            },
            {
              title: "Adjustments",
              value: stats.adjustment,
              icon: <RefreshCcw />,
              color: "yellow",
            },
          ]}
        />
      </div>

      <div className="mb-8">
        <Filters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search ledger by reference, user, module or description..."
          filters={[
            {
              key: "type",
              value: type,
              onChange: setType,
              options: [
                { value: "ALL", label: "All Types" },
                { value: "CREDIT", label: "Credit" },
                { value: "DEBIT", label: "Debit" },
                { value: "REFUND", label: "Refund" },
                { value: "REVERSAL", label: "Reversal" },
                { value: "ADJUSTMENT", label: "Adjustment" },
              ],
            },
          ]}
          onReset={() => {
            setSearch("");
            setType("ALL");
            loadLedger();
          }}
        />
      </div>

      <div className="mb-6 flex justify-end gap-3">
        <ActionButton
          icon={<RefreshCcw size={18} />}
          variant="secondary"
          onClick={loadLedger}
        >
          Refresh
        </ActionButton>

        <ActionButton icon={<Download size={18} />} variant="secondary">
          Export
        </ActionButton>
      </div>

      <DataTable
        title="Wallet Ledger"
        description="Complete wallet movement history."
        columns={columns}
        data={filteredLedger}
        searchKeys={["reference", "module", "description"]}
        pageSize={10}
      />
    </DashboardLayout>
  );
}