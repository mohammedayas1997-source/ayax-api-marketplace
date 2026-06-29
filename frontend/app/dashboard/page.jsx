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

import DashboardSidebar from "@/components/DashboardSidebar";

const stats = [
  {
    title: "Wallet Balance",
    value: "₦125,450.00",
    icon: <Wallet />,
  },
  {
    title: "API Calls",
    value: "18,240",
    icon: <Activity />,
  },
  {
    title: "Active API Keys",
    value: "3",
    icon: <KeyRound />,
  },
  {
    title: "Total Spend",
    value: "₦82,900.00",
    icon: <BarChart3 />,
  },
];

const transactions = [
  {
    ref: "AYAX-2026-0001",
    service: "Data Purchase",
    amount: "₦5",
    status: "Successful",
  },
  {
    ref: "AYAX-2026-0002",
    service: "Airtime Purchase",
    amount: "₦3",
    status: "Processing",
  },
  {
    ref: "AYAX-2026-0003",
    service: "Transaction Check",
    amount: "₦1",
    status: "Successful",
  },
];
socket.on("wallet-updated",()=>{
   fetchWallet();
});

socket.on("api-key-created",()=>{
   fetchApiKeys();
});

socket.on("purchase-successful",()=>{
   fetchTransactions();
});

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="dashboard" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold">
                Developer Dashboard
              </h1>

              <p className="text-slate-400 mt-2">
                Manage wallet, API keys, usage logs and live transactions.
              </p>
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <PlusCircle size={18} />
              Fund Wallet
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((item) => (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="text-blue-400">{item.icon}</div>
                  <ArrowUpRight size={18} className="text-slate-500" />
                </div>

                <p className="text-slate-400 mt-5">
                  {item.title}
                </p>

                <h2 className="text-3xl font-extrabold mt-2">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">
                Recent Transactions
              </h2>

              <div className="space-y-4">
                {transactions.map((trx) => (
                  <div
                    key={trx.ref}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {trx.service}
                      </h3>

                      <p className="text-sm text-slate-500">
                        {trx.ref}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold">
                        {trx.amount}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          trx.status === "Successful"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {trx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">
                Live API Key
              </h2>

              <p className="text-slate-400 text-sm mb-4">
                Use this key in your request header as x-api-key.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-slate-300 break-all">
                ayax_live_82d9f3a9139a1f65c9a93e8a5f4b2c88
              </div>

              <button className="mt-5 w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
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
        </section>
      </div>
    </main>
  );
}