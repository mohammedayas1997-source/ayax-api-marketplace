import {
  Search,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  ReceiptText,
} from "lucide-react";

import DashboardSidebar from "@/components/DashboardSidebar";

const transactions = [
  {
    ref: "AYAX-2026-0001",
    service: "Data Purchase",
    phone: "08012345678",
    amount: "₦5",
    status: "Successful",
    date: "2026-06-17 10:25 AM",
  },
  {
    ref: "AYAX-2026-0002",
    service: "Airtime Purchase",
    phone: "08098765432",
    amount: "₦3",
    status: "Processing",
    date: "2026-06-17 11:02 AM",
  },
  {
    ref: "AYAX-2026-0003",
    service: "Transaction Status Check",
    phone: "-",
    amount: "₦1",
    status: "Failed",
    date: "2026-06-16 04:41 PM",
  },
];

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="transactions" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold">
                Transactions
              </h1>

              <p className="text-slate-400 mt-2">
                View all API transactions, wallet deductions and service status.
              </p>
            </div>

            <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <Download size={18} />
              Export CSV
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
              <Search size={18} className="text-slate-500" />

              <input
                type="text"
                placeholder="Search by reference, service, phone or status..."
                className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>Reference</span>
              <span>Service</span>
              <span>Phone</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-slate-800">
              {transactions.map((trx) => (
                <div
                  key={trx.ref}
                  className="grid md:grid-cols-6 gap-4 px-6 py-5 items-center"
                >
                  <div className="flex items-center gap-3">
                    <ReceiptText size={18} className="text-blue-400" />

                    <span className="font-mono text-sm">
                      {trx.ref}
                    </span>
                  </div>

                  <span className="text-slate-300">
                    {trx.service}
                  </span>

                  <span className="text-slate-400">
                    {trx.phone}
                  </span>

                  <span className="font-bold">
                    {trx.amount}
                  </span>

                  <StatusBadge status={trx.status} />

                  <span className="text-slate-500 text-sm">
                    {trx.date}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Successful: "bg-green-500/10 text-green-400",
    Processing: "bg-yellow-500/10 text-yellow-400",
    Failed: "bg-red-500/10 text-red-400",
  };

  const icons = {
    Successful: <CheckCircle size={16} />,
    Processing: <Clock size={16} />,
    Failed: <XCircle size={16} />,
  };

  return (
    <span
      className={`w-fit px-3 py-1 rounded-full text-xs flex items-center gap-2 ${
        styles[status] || "bg-slate-500/10 text-slate-400"
      }`}
    >
      {icons[status]}
      {status}
    </span>
  );
}