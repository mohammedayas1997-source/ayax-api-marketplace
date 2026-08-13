"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  Activity,
  ShieldAlert,
  Wallet,
  User,
} from "lucide-react";

const initialRequests = [
  {
    id: "REQ-1001",
    type: "Refund Request",
    from: "Customer Service",
    customer: "Tech Hub Ltd",
    amount: "₦1,000",
    reason: "Failed Airtime VTU transaction",
    status: "Pending",
  },
  {
    id: "REQ-1002",
    type: "GSM Recharge Approval",
    from: "GSM Staff",
    customer: "Company SIM 12",
    amount: "₦5,000",
    reason: "Low SIM balance",
    status: "Pending",
  },
];

const activities = [
  {
    staff: "Customer Service",
    action: "Created refund request for Tech Hub Ltd",
    time: "2 mins ago",
    icon: <ShieldAlert />,
  },
  {
    staff: "GSM Staff",
    action: "Recharged SIM 5 with ₦1,000",
    time: "8 mins ago",
    icon: <Wallet />,
  },
  {
    staff: "Admin",
    action: "Viewed user wallet history",
    time: "15 mins ago",
    icon: <User />,
  },
];

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState("");

  const updateRequest = (id, status) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );

    setMessage(`Request ${id} has been ${status}.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="requests" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Bell />
              <span className="font-semibold">Admin Control Center</span>
            </div>

            <h1 className="text-3xl font-extrabold">
              Requests & Staff Activities
            </h1>

            <p className="text-slate-400 mt-2">
              View staff actions, approve requests, reject requests and monitor all activities.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section className="grid md:grid-cols-3 gap-6 mb-8">
            <Stat title="Pending Requests" value={requests.filter(r => r.status === "Pending").length} />
            <Stat title="Approved Requests" value={requests.filter(r => r.status === "Approved").length} />
            <Stat title="Rejected Requests" value={requests.filter(r => r.status === "Rejected").length} />
          </section>

          <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Incoming Requests</h2>

              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{req.type}</h3>
                        <p className="text-sm text-slate-500">
                          {req.id} • From: {req.from}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          {req.customer} — {req.amount}
                        </p>
                        <p className="text-sm text-slate-500">
                          Reason: {req.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-2 rounded-xl text-xs ${
                            req.status === "Pending"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : req.status === "Approved"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {req.status}
                        </span>

                        <button className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl">
                          <Eye size={17} />
                        </button>

                        <button
                          onClick={() => updateRequest(req.id, "Approved")}
                          className="bg-green-500/10 text-green-400 hover:bg-green-500/20 p-3 rounded-xl"
                        >
                          <CheckCircle size={17} />
                        </button>

                        <button
                          onClick={() => updateRequest(req.id, "Rejected")}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-3 rounded-xl"
                        >
                          <XCircle size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Activity className="text-blue-400" />
                <h2 className="text-xl font-bold">Staff Activity Logs</h2>
              </div>

              <div className="space-y-4">
                {activities.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-blue-400">{item.icon}</div>
                      <div>
                        <h3 className="font-semibold">{item.staff}</h3>
                        <p className="text-sm text-slate-400">{item.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
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