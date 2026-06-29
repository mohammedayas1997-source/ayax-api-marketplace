"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  LockKeyhole,
  Wallet,
  AlertTriangle,
} from "lucide-react";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialRefunds = [
  {
    id: "REF-1001",
    customer: "Tech Hub Ltd",
    customerId: "CUS-1001",
    trxRef: "AYAX-TRX-001",
    amount: 1000,
    reason: "Failed Airtime VTU transaction",
    requestedBy: "Customer Service",
    status: "Pending",
    walletBefore: 52800,
    date: "2026-06-19",
  },
  {
    id: "REF-1002",
    customer: "JohnSoft",
    customerId: "CUS-1002",
    trxRef: "AYAX-TRX-004",
    amount: 500,
    reason: "Data not delivered",
    requestedBy: "Customer Service",
    status: "Pending",
    walletBefore: 12500,
    date: "2026-06-19",
  },
];

const ADMIN_PIN = "1234";

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState(initialRefunds);
  const [selectedRefund, setSelectedRefund] = useState(initialRefunds[0]);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);

  const pending = refunds.filter((r) => r.status === "Pending").length;
  const approved = refunds.filter((r) => r.status === "Approved").length;
  const rejected = refunds.filter((r) => r.status === "Rejected").length;

  const approveRefund = () => {
    if (!selectedRefund) return;

    if (pin !== ADMIN_PIN) {
      setMessage("Invalid transaction PIN. Refund not approved.");
      return;
    }

    setRefunds((prev) =>
      prev.map((refund) =>
        refund.id === selectedRefund.id
          ? {
              ...refund,
              status: "Approved",
              walletAfter: refund.walletBefore + refund.amount,
            }
          : refund
      )
    );

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        action: `Approved refund ${selectedRefund.id}`,
        amount: selectedRefund.amount,
        customer: selectedRefund.customer,
        time: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);

    setSelectedRefund((prev) => ({
      ...prev,
      status: "Approved",
      walletAfter: prev.walletBefore + prev.amount,
    }));

    setPin("");
    setMessage(`Refund ${selectedRefund.id} approved successfully.`);
  };

  const rejectRefund = () => {
    if (!selectedRefund) return;

    setRefunds((prev) =>
      prev.map((refund) =>
        refund.id === selectedRefund.id
          ? { ...refund, status: "Rejected" }
          : refund
      )
    );

    setAuditLogs((prev) => [
      {
        id: Date.now(),
        action: `Rejected refund ${selectedRefund.id}`,
        amount: selectedRefund.amount,
        customer: selectedRefund.customer,
        time: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);

    setSelectedRefund((prev) => ({
      ...prev,
      status: "Rejected",
    }));

    setMessage(`Refund ${selectedRefund.id} rejected.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="refunds" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <ShieldCheck />
              <span className="font-semibold">Admin Refund Control</span>
            </div>

            <h1 className="text-3xl font-extrabold">
              Refund Requests Center
            </h1>

            <p className="text-slate-400 mt-2">
              Approve or reject refund requests from Customer Service. Approval
              requires Admin Transaction PIN.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <Stat title="Pending" value={pending} />
            <Stat title="Approved" value={approved} />
            <Stat title="Rejected" value={rejected} />
            <Stat title="Total Requests" value={refunds.length} />
          </section>

          <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Incoming Refunds</h2>

              <div className="space-y-4">
                {refunds.map((refund) => (
                  <button
                    key={refund.id}
                    onClick={() => setSelectedRefund(refund)}
                    className={`w-full text-left bg-slate-950 border rounded-2xl p-5 ${
                      selectedRefund?.id === refund.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{refund.customer}</h3>
                        <p className="text-sm text-slate-500">
                          {refund.id} • {refund.trxRef}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          {refund.reason}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold">
                          {formatNaira(refund.amount)}
                        </span>

                        <StatusBadge status={refund.status} />

                        <Eye size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5">Refund Details</h2>

                <div className="space-y-4">
                  <ReadOnly label="Refund ID" value={selectedRefund.id} />
                  <ReadOnly label="Customer" value={selectedRefund.customer} />
                  <ReadOnly label="Customer ID" value={selectedRefund.customerId} />
                  <ReadOnly label="Transaction Ref" value={selectedRefund.trxRef} />
                  <ReadOnly label="Amount" value={formatNaira(selectedRefund.amount)} />
                  <ReadOnly label="Requested By" value={selectedRefund.requestedBy} />
                  <ReadOnly label="Reason" value={selectedRefund.reason} />
                  <ReadOnly label="Status" value={selectedRefund.status} />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <LockKeyhole className="text-blue-400" />
                  <h2 className="text-xl font-bold">Approve With PIN</h2>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-2xl p-4 mb-5 flex gap-3">
                  <AlertTriangle size={20} />
                  <p className="text-sm">
                    Customer Service cannot refund. Only Admin can approve with
                    Transaction PIN.
                  </p>
                </div>

                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Admin Transaction PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
                />

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    onClick={approveRefund}
                    disabled={selectedRefund.status !== "Pending"}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-40 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve Refund
                  </button>

                  <button
                    onClick={rejectRefund}
                    disabled={selectedRefund.status !== "Pending"}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Test PIN: 1234. Backend later will verify hashed PIN securely.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Wallet className="text-blue-400" />
                  <h2 className="text-xl font-bold">Audit Logs</h2>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-slate-500 text-sm">No admin action yet.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                      >
                        <h3 className="font-semibold">{log.action}</h3>
                        <p className="text-sm text-slate-500">
                          {log.customer} • {formatNaira(log.amount)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {log.time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
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

function StatusBadge({ status }) {
  const style =
    status === "Approved"
      ? "bg-green-500/10 text-green-400"
      : status === "Rejected"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`px-3 py-1 rounded-full text-xs ${style}`}>
      {status}
    </span>
  );
}