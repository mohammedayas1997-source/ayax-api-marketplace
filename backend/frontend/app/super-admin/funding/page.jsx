"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  LockKeyhole,
  Download,
  Wallet,
  Banknote,
  AlertTriangle,
} from "lucide-react";

import api from "@/lib/api";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialRequests = [
  {
    id: "FUND-1001",
    customer: "Tech Hub Ltd",
    customerId: "CUS-1001",
    email: "api@techhub.com",
    phone: "08012345678",
    amount: 50000,
    channel: "Bank Transfer",
    reference: "AYAX-FUND-001",
    proof: "Uploaded",
    status: "Pending",
    date: "2026-06-19 10:25 AM",
    walletBefore: 52800,
  },
  {
    id: "FUND-1002",
    customer: "JohnSoft",
    customerId: "CUS-1002",
    email: "john@company.com",
    phone: "08098765432",
    amount: 10000,
    channel: "Paystack",
    reference: "AYAX-FUND-002",
    proof: "Verified",
    status: "Approved",
    date: "2026-06-19 11:40 AM",
    walletBefore: 12500,
  },
];

export default function SuperFundingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const SUPER_PIN = "123456";

  const filteredRequests = useMemo(() => {
    const q = query.toLowerCase();

    return requests.filter((item) => {
      const matchesSearch =
        item.customer.toLowerCase().includes(q) ||
        item.customerId.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.reference.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, query, statusFilter]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved").length,
    rejected: requests.filter((r) => r.status === "Rejected").length,
    totalAmount: requests
      .filter((r) => r.status === "Approved")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  const loadFundingRequests = async () => {
  try {
    setLoading(true);

    const res = await api.get("/wallet/funding");

    setRequests(res.data.fundings || []);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadFundingRequests();
}, []);

  const approveFunding = async () => {
  try {
    await api.patch(
      `/wallet/funding/${selectedRequest.id}/approve`,
      {
        pin,
      }
    );

    loadFundingRequests();

    setMessage("Funding approved successfully.");

  } catch (err) {
    alert(err.response?.data?.message);
  }
};

  const rejectFunding = async () => {
  try {
    await api.patch(
      `/wallet/funding/${selectedRequest.id}/reject`,
      {}
    );

    loadFundingRequests();

    setMessage("Funding rejected.");

  } catch (err) {
    alert(err.response?.data?.message);
  }
};

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Funding Center" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Requests" value={stats.total} icon={<CreditCard />} />
            <Stat title="Pending" value={stats.pending} icon={<Clock />} />
            <Stat title="Approved" value={stats.approved} icon={<CheckCircle />} />
            <Stat title="Rejected" value={stats.rejected} icon={<XCircle />} />
          </section>

          <section className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={32} />
              <h2 className="text-2xl font-bold">Approved Funding Total</h2>
            </div>

            <h3 className="text-5xl font-extrabold">
              {formatNaira(stats.totalAmount)}
            </h3>

            <p className="text-blue-100 mt-3">
              Total wallet funding approved by Super Admin.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search funding by customer, ID, phone, email or reference..."
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
                <span>Channel</span>
                <span>Proof</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredRequests.map((item) => (
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
                    <span className="text-slate-400">{item.channel}</span>

                    <span className="bg-blue-500/10 text-blue-400 w-fit px-3 py-1 rounded-full text-xs">
                      {item.proof}
                    </span>

                    <StatusBadge status={item.status} />

                    <button
                      onClick={() => setSelectedRequest(item)}
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
                  <Banknote className="text-blue-400" />
                  <h2 className="text-xl font-bold">Funding Details</h2>
                </div>

                {!selectedRequest ? (
                  <p className="text-slate-500 text-sm">
                    Select a funding request to view details.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <ReadOnly label="Funding ID" value={selectedRequest.id} />
                    <ReadOnly label="Customer" value={selectedRequest.customer} />
                    <ReadOnly label="Customer ID" value={selectedRequest.customerId} />
                    <ReadOnly label="Reference" value={selectedRequest.reference} />
                    <ReadOnly label="Amount" value={formatNaira(selectedRequest.amount)} />
                    <ReadOnly label="Channel" value={selectedRequest.channel} />
                    <ReadOnly label="Proof Status" value={selectedRequest.proof} />
                    <ReadOnly label="Wallet Before" value={formatNaira(selectedRequest.walletBefore)} />
                    <ReadOnly
                      label="Wallet After"
                      value={formatNaira(
                        selectedRequest.walletAfter ||
                          selectedRequest.walletBefore + selectedRequest.amount
                      )}
                    />
                    <ReadOnly label="Status" value={selectedRequest.status} />
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
                    Funding approval will credit the customer wallet. Super Admin PIN is required.
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
                    onClick={approveFunding}
                    disabled={!selectedRequest || selectedRequest.status !== "Pending"}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-40 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>

                  <button
                    onClick={rejectFunding}
                    disabled={!selectedRequest || selectedRequest.status !== "Pending"}
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