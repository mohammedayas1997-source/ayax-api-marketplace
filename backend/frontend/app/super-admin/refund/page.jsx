"use client";

import { useMemo, useState } from "react";
import {
  RefreshCcw,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  LockKeyhole,
  Download,
  Wallet,
  ReceiptText,
  AlertTriangle,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialRefunds = [
  {
    id: "REF-1001",
    customer: "Tech Hub Ltd",
    customerId: "CUS-1001",
    email: "api@techhub.com",
    phone: "08012345678",
    trxRef: "AYAX-TRX-001",
    amount: 1000,
    reason: "Failed Airtime VTU transaction",
    requestedBy: "Customer Service",
    status: "Pending",
    walletBefore: 52800,
    date: "2026-06-19 10:25 AM",
  },
  {
    id: "REF-1002",
    customer: "JohnSoft",
    customerId: "CUS-1002",
    email: "john@company.com",
    phone: "08098765432",
    trxRef: "AYAX-TRX-004",
    amount: 500,
    reason: "Data not delivered",
    requestedBy: "Customer Service",
    status: "Approved",
    walletBefore: 12500,
    walletAfter: 13000,
    date: "2026-06-19 11:40 AM",
  },
];

export default function SuperRefundPage() {
  const [refunds, setRefunds] = useState(initialRefunds);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const SUPER_PIN = "123456";

  const filteredRefunds = useMemo(() => {
    const q = query.toLowerCase();

    return refunds.filter((item) => {
      const matchesSearch =
        item.customer.toLowerCase().includes(q) ||
        item.customerId.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.trxRef.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [refunds, query, statusFilter]);

  const stats = {
    total: refunds.length,
    pending: refunds.filter((r) => r.status === "Pending").length,
    approved: refunds.filter((r) => r.status === "Approved").length,
    rejected: refunds.filter((r) => r.status === "Rejected").length,
    totalApproved: refunds
      .filter((r) => r.status === "Approved")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  const approveRefund = () => {
    if (!selectedRefund) return;

    if (pin !== SUPER_PIN) {
      setMessage("Invalid Super Admin PIN.");
      return;
    }

    setRefunds((prev) =>
      prev.map((item) =>
        item.id === selectedRefund.id
          ? {
              ...item,
              status: "Approved",
              walletAfter: item.walletBefore + item.amount,
            }
          : item
      )
    );

    setSelectedRefund((prev) => ({
      ...prev,
      status: "Approved",
      walletAfter: prev.walletBefore + prev.amount,
    }));

    setPin("");
    setMessage(`${selectedRefund.id} approved and customer wallet refunded.`);
  };

  const rejectRefund = () => {
    if (!selectedRefund) return;

    setRefunds((prev) =>
      prev.map((item) =>
        item.id === selectedRefund.id
          ? {
              ...item,
              status: "Rejected",
            }
          : item
      )
    );

    setSelectedRefund((prev) => ({
      ...prev,
      status: "Rejected",
    }));

    setMessage(`${selectedRefund.id} rejected.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Refund Center" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Refunds" value={stats.total} icon={<RefreshCcw />} />
            <Stat title="Pending" value={stats.pending} icon={<Clock />} />
            <Stat title="Approved" value={stats.approved} icon={<CheckCircle />} />
            <Stat title="Rejected" value={stats.rejected} icon={<XCircle />} />
          </section>

          <section className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={32} />
              <h2 className="text-2xl font-bold">Approved Refund Total</h2>
            </div>

            <h3 className="text-5xl font-extrabold">
              {formatNaira(stats.totalApproved)}
            </h3>

            <p className="text-blue-100 mt-3">
              Total refund approved and credited back to customer wallets.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search refund by customer, ID, phone, email or transaction ref..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button className="bg-slate-800 hover:bg-slate-700 rounded-2xl font-semibold flex items-center justify-center gap-2">
                <Download size={18} />
                Export
              </button>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
                <span>Customer</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Amount</span>
                <span>Transaction</span>
                <span>Requested By</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredRefunds.map((item) => (
                  <div
                    key={item.id}
                    className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                  >
                    <div>
                      <h3 className="font-bold">{item.customer}</h3>
                      <p className="text-xs text-slate-500">{item.id}</p>
                    </div>

                    <span className="text-slate-400 break-all">{item.email}</span>
                    <span className="text-slate-400">{item.phone}</span>
                    <span className="font-bold">{formatNaira(item.amount)}</span>
                    <span className="text-blue-400 font-mono text-xs">{item.trxRef}</span>
                    <span className="text-slate-400">{item.requestedBy}</span>

                    <StatusBadge status={item.status} />

                    <button
                      onClick={() => setSelectedRefund(item)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg w-fit"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <ReceiptText className="text-blue-400" />
                  <h2 className="text-xl font-bold">Refund Details</h2>
                </div>

                {!selectedRefund ? (
                  <p className="text-slate-500 text-sm">
                    Select a refund request to view details.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <ReadOnly label="Refund ID" value={selectedRefund.id} />
                    <ReadOnly label="Customer" value={selectedRefund.customer} />
                    <ReadOnly label="Customer ID" value={selectedRefund.customerId} />
                    <ReadOnly label="Transaction Ref" value={selectedRefund.trxRef} />
                    <ReadOnly label="Amount" value={formatNaira(selectedRefund.amount)} />
                    <ReadOnly label="Reason" value={selectedRefund.reason} />
                    <ReadOnly label="Requested By" value={selectedRefund.requestedBy} />
                    <ReadOnly label="Wallet Before" value={formatNaira(selectedRefund.walletBefore)} />
                    <ReadOnly
                      label="Wallet After"
                      value={formatNaira(
                        selectedRefund.walletAfter ||
                          selectedRefund.walletBefore + selectedRefund.amount
                      )}
                    />
                    <ReadOnly label="Status" value={selectedRefund.status} />
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <LockKeyhole className="text-blue-400" />
                  <h2 className="text-xl font-bold">Approve With PIN</h2>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-2xl p-4 mb-5 flex gap-3">
                  <AlertTriangle size={20} />
                  <p className="text-sm">
                    Refund approval will credit customer wallet. Super Admin PIN is required.
                  </p>
                </div>

                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Super Admin PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
                />

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    onClick={approveRefund}
                    disabled={!selectedRefund || selectedRefund.status !== "Pending"}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-40 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>

                  <button
                    onClick={rejectRefund}
                    disabled={!selectedRefund || selectedRefund.status !== "Pending"}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Test PIN: 123456
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Approved"
      ? "bg-green-500/10 text-green-400"
      : status === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs ${style}`}>
      {status}
    </span>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none cursor-not-allowed"
      />
    </div>
  );
}