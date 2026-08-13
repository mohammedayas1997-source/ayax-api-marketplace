"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCcw,
  Wifi,
  Smartphone,
  Tv,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const transactions = [
  {
    id: "TRX-1001",
    customer: "Tech Hub Ltd",
    service: "MTN SME 1GB",
    type: "DATA",
    amount: 280,
    status: "SUCCESS",
    date: "2 mins ago",
  },
  {
    id: "TRX-1002",
    customer: "JohnSoft",
    service: "Airtime VTU",
    type: "AIRTIME",
    amount: 1000,
    status: "PROCESSING",
    date: "8 mins ago",
  },
  {
    id: "TRX-1003",
    customer: "API Reseller NG",
    service: "DSTV Compact",
    type: "CABLE",
    amount: 15500,
    status: "FAILED",
    date: "15 mins ago",
  },
  {
    id: "TRX-1004",
    customer: "Ayax Agent",
    service: "PHCN Payment",
    type: "ELECTRICITY",
    amount: 25000,
    status: "SUCCESS",
    date: "25 mins ago",
  },
];

const formatNaira = (amount) =>
  `₦${Number(amount).toLocaleString("en-US")}`;

export default function RecentTransactions() {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          Recent Transactions
        </h2>

        <button className="text-blue-400 text-sm font-semibold hover:text-blue-300">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((trx) => (
          <div
            key={trx.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-5 hover:border-blue-500 transition"
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                  <ServiceIcon type={trx.type} />
                </div>

                <div>
                  <h3 className="font-bold">
                    {trx.customer}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    {trx.service}
                  </p>

                  <p className="text-xs text-slate-600 mt-2">
                    {trx.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-slate-800 px-3 py-2 rounded-xl text-sm">
                  {trx.type}
                </span>

                <span className="font-bold text-lg">
                  {formatNaira(trx.amount)}
                </span>

                <StatusBadge status={trx.status} />

                <span className="text-xs text-slate-500">
                  {trx.date}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServiceIcon({ type }) {
  switch (type) {
    case "DATA":
      return <Wifi size={22} />;
    case "AIRTIME":
      return <Smartphone size={22} />;
    case "CABLE":
      return <Tv size={22} />;
    case "ELECTRICITY":
      return <Zap size={22} />;
    case "CREDIT":
      return <ArrowDownCircle size={22} />;
    case "DEBIT":
      return <ArrowUpCircle size={22} />;
    case "REFUND":
      return <RefreshCcw size={22} />;
    default:
      return <Wifi size={22} />;
  }
}

function StatusBadge({ status }) {
  if (status === "SUCCESS") {
    return (
      <span className="bg-green-500/10 text-green-400 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
        <CheckCircle size={14} />
        SUCCESS
      </span>
    );
  }

  if (status === "PROCESSING") {
    return (
      <span className="bg-yellow-500/10 text-yellow-400 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
        <Clock size={14} />
        PROCESSING
      </span>
    );
  }

  return (
    <span className="bg-red-500/10 text-red-400 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
      <XCircle size={14} />
      FAILED
    </span>
  );
}