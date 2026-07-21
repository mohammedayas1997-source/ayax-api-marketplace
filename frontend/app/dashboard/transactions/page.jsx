"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  ReceiptText,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  Filter,
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

const normalizeStatus = (status) =>
  String(status || "PENDING")
    .trim()
    .toUpperCase();

const normalizeType = (type) =>
  String(type || "")
    .trim()
    .toUpperCase();

const getTransactionPhone = (transaction) =>
  transaction?.phoneNumber ||
  transaction?.phone ||
  transaction?.recipient ||
  transaction?.metadata?.phoneNumber ||
  transaction?.payload?.phoneNumber ||
  "-";

const getTransactionService = (transaction) =>
  transaction?.service ||
  transaction?.description ||
  transaction?.category ||
  transaction?.module ||
  "Transaction";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchTransactions = useCallback(async () => {
    const response = await api.get("/wallet/transactions");

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

  const loadTransactions = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        await fetchTransactions();
      } catch (error) {
        setMessage(
          getErrorMessage(
            error,
            "Unable to load transactions."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchTransactions]
  );

  useEffect(() => {
    loadTransactions();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleTransactionUpdate = () => {
      fetchTransactions().catch(console.error);
    };

    socket.on(
      "transaction-updated",
      handleTransactionUpdate
    );

    socket.on(
      "purchase-successful",
      handleTransactionUpdate
    );

    socket.on(
      "purchase-failed",
      handleTransactionUpdate
    );

    socket.on(
      "wallet-updated",
      handleTransactionUpdate
    );

    return () => {
      socket.off(
        "transaction-updated",
        handleTransactionUpdate
      );

      socket.off(
        "purchase-successful",
        handleTransactionUpdate
      );

      socket.off(
        "purchase-failed",
        handleTransactionUpdate
      );

      socket.off(
        "wallet-updated",
        handleTransactionUpdate
      );
    };
  }, [loadTransactions, fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const transactionStatus =
        normalizeStatus(transaction?.status);

      const transactionType =
        normalizeType(transaction?.type);

      const reference = String(
        transaction?.reference || ""
      ).toLowerCase();

      const service = String(
        getTransactionService(transaction)
      ).toLowerCase();

      const phone = String(
        getTransactionPhone(transaction)
      ).toLowerCase();

      const description = String(
        transaction?.description || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        reference.includes(query) ||
        service.includes(query) ||
        phone.includes(query) ||
        description.includes(query) ||
        transactionStatus
          .toLowerCase()
          .includes(query) ||
        transactionType
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "ALL" ||
        transactionStatus === status;

      const matchesType =
        type === "ALL" ||
        transactionType === type;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });
  }, [transactions, search, status, type]);

  const statistics = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        const transactionStatus =
          normalizeStatus(transaction?.status);

        result.total += 1;

        if (
          transactionStatus === "SUCCESSFUL" ||
          transactionStatus === "COMPLETED" ||
          transactionStatus === "APPROVED"
        ) {
          result.successful += 1;
        } else if (
          transactionStatus === "FAILED" ||
          transactionStatus === "REJECTED" ||
          transactionStatus === "CANCELLED"
        ) {
          result.failed += 1;
        } else {
          result.pending += 1;
        }

        return result;
      },
      {
        total: 0,
        successful: 0,
        pending: 0,
        failed: 0,
      }
    );
  }, [transactions]);

  const exportCsv = () => {
    if (filteredTransactions.length === 0) {
      setMessage("No transactions available to export.");
      return;
    }

    const headers = [
      "Reference",
      "Service",
      "Phone",
      "Type",
      "Amount",
      "Status",
      "Description",
      "Date",
    ];

    const rows = filteredTransactions.map(
      (transaction) => [
        transaction.reference || "",
        getTransactionService(transaction),
        getTransactionPhone(transaction),
        normalizeType(transaction.type),
        Number(transaction.amount || 0),
        normalizeStatus(transaction.status),
        transaction.description || "",
        transaction.createdAt
          ? new Date(
              transaction.createdAt
            ).toISOString()
          : "",
      ]
    );

    const escapeCsvValue = (value) =>
      `"${String(value ?? "").replace(
        /"/g,
        '""'
      )}"`;

    const csvContent = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ayax-transactions-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setType("ALL");
  };

  return (
    <DashboardLayout
      title="Transactions"
      description="View all API transactions, wallet deductions and service status."
    >
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <span>{message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
        <button
          type="button"
          onClick={() =>
            loadTransactions({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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

        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {!loading && (
        <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Transactions"
            value={statistics.total}
            type="total"
          />

          <StatCard
            title="Successful"
            value={statistics.successful}
            type="successful"
          />

          <StatCard
            title="Processing"
            value={statistics.pending}
            type="processing"
          />

          <StatCard
            title="Failed"
            value={statistics.failed}
            type="failed"
          />
        </section>
      )}

      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_190px_190px_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
            <Search
              size={18}
              className="shrink-0 text-slate-500"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search reference, service, phone or status..."
              className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
          >
            <option value="ALL">
              All Statuses
            </option>
            <option value="PENDING">
              Pending
            </option>
            <option value="PROCESSING">
              Processing
            </option>
            <option value="SUCCESSFUL">
              Successful
            </option>
            <option value="FAILED">
              Failed
            </option>
            <option value="REVERSED">
              Reversed
            </option>
          </select>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
          >
            <option value="ALL">
              All Types
            </option>
            <option value="CREDIT">
              Credit
            </option>
            <option value="DEBIT">
              Debit
            </option>
            <option value="REFUND">
              Refund
            </option>
            <option value="REVERSAL">
              Reversal
            </option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-4 font-semibold hover:bg-slate-700"
          >
            <Filter size={18} />
            Clear
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex items-center gap-3 text-slate-400">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading transactions...
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <ReceiptText
            size={42}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No transactions found
          </h2>

          <p className="mt-2 text-slate-400">
            No transaction matches the selected
            search or filters.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="hidden grid-cols-7 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 lg:grid">
            <span>Reference</span>
            <span>Service</span>
            <span>Phone</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
          </div>

          <div className="divide-y divide-slate-800">
            {filteredTransactions.map(
              (transaction) => {
                const transactionStatus =
                  normalizeStatus(
                    transaction?.status
                  );

                const transactionType =
                  normalizeType(
                    transaction?.type
                  );

                return (
                  <div
                    key={
                      transaction.id ||
                      transaction.reference
                    }
                    className="grid gap-4 px-6 py-5 lg:grid-cols-7 lg:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <ReceiptText
                        size={18}
                        className="shrink-0 text-blue-400"
                      />

                      <span className="break-all font-mono text-sm">
                        {transaction.reference ||
                          "-"}
                      </span>
                    </div>

                    <MobileField label="Service">
                      <span className="text-slate-300">
                        {getTransactionService(
                          transaction
                        )}
                      </span>
                    </MobileField>

                    <MobileField label="Phone">
                      <span className="text-slate-400">
                        {getTransactionPhone(
                          transaction
                        )}
                      </span>
                    </MobileField>

                    <MobileField label="Type">
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs ${
                          transactionType ===
                          "CREDIT"
                            ? "bg-green-500/10 text-green-400"
                            : transactionType ===
                              "DEBIT"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {transactionType ||
                          "-"}
                      </span>
                    </MobileField>

                    <MobileField label="Amount">
                      <span className="font-bold">
                        {formatNaira(
                          transaction.amount
                        )}
                      </span>
                    </MobileField>

                    <MobileField label="Status">
                      <StatusBadge
                        status={
                          transactionStatus
                        }
                      />
                    </MobileField>

                    <MobileField label="Date">
                      <span className="text-sm text-slate-500">
                        {transaction.createdAt
                          ? new Date(
                              transaction.createdAt
                            ).toLocaleString()
                          : "-"}
                      </span>
                    </MobileField>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}

function MobileField({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 lg:hidden">
        {label}
      </p>

      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus =
    normalizeStatus(status);

  const config = {
    SUCCESSFUL: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle size={16} />,
    },
    COMPLETED: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle size={16} />,
    },
    PROCESSING: {
      classes:
        "bg-blue-500/10 text-blue-400",
      icon: <Clock size={16} />,
    },
    PENDING: {
      classes:
        "bg-yellow-500/10 text-yellow-400",
      icon: <Clock size={16} />,
    },
    FAILED: {
      classes:
        "bg-red-500/10 text-red-400",
      icon: <XCircle size={16} />,
    },
    REJECTED: {
      classes:
        "bg-red-500/10 text-red-400",
      icon: <XCircle size={16} />,
    },
    REVERSED: {
      classes:
        "bg-purple-500/10 text-purple-400",
      icon: <RefreshCcw size={16} />,
    },
  };

  const selected =
    config[normalizedStatus] || {
      classes:
        "bg-slate-500/10 text-slate-400",
      icon: <Clock size={16} />,
    };

  return (
    <span
      className={`flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs ${selected.classes}`}
    >
      {selected.icon}
      {normalizedStatus}
    </span>
  );
}

function StatCard({ title, value, type }) {
  const config = {
    total: {
      classes:
        "bg-blue-500/10 text-blue-400",
      icon: <ReceiptText size={22} />,
    },
    successful: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle size={22} />,
    },
    processing: {
      classes:
        "bg-yellow-500/10 text-yellow-400",
      icon: <Clock size={22} />,
    },
    failed: {
      classes:
        "bg-red-500/10 text-red-400",
      icon: <XCircle size={22} />,
    },
  };

  const selected = config[type];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected.classes}`}
      >
        {selected.icon}
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}