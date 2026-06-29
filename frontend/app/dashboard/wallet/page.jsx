import {
  Wallet,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";

import DashboardSidebar from "@/components/DashboardSidebar";

const history = [
  {
    type: "Credit",
    desc: "Wallet Funding",
    amount: "₦50,000",
    status: "Successful",
    date: "2026-06-17",
  },
  {
    type: "Debit",
    desc: "Data API Usage",
    amount: "₦5",
    status: "Successful",
    date: "2026-06-17",
  },
  {
    type: "Debit",
    desc: "Airtime API Usage",
    amount: "₦3",
    status: "Successful",
    date: "2026-06-16",
  },
];

export default function WalletPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="wallet" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <h1 className="text-3xl font-extrabold">Wallet</h1>
              <p className="text-slate-400 mt-2">
                Fund your wallet and monitor all API deductions.
              </p>
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <PlusCircle size={18} />
              Fund Wallet
            </button>
          </div>

          <section className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-slate-900 rounded-3xl p-8 border border-blue-500">
              <div className="flex items-center gap-3">
                <Wallet size={32} />
                <span className="font-semibold">Available Balance</span>
              </div>

              <h2 className="text-5xl font-extrabold mt-8">₦125,450.00</h2>

              <p className="text-blue-100 mt-4">
                This balance is used automatically when your API requests are
                processed.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-xl font-bold mb-5">Quick Funding</h3>

              <div className="space-y-3">
                {["₦5,000", "₦10,000", "₦50,000"].map((amount) => (
                  <button
                    key={amount}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-blue-500 py-3 rounded-xl font-semibold"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <button className="mt-5 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <CreditCard size={18} />
                Fund with Card
              </button>
            </div>
          </section>

          <section className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-5">Wallet History</h2>

            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        item.type === "Credit"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {item.type === "Credit" ? (
                        <ArrowDownLeft size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold">{item.desc}</h3>
                      <p className="text-sm text-slate-500">{item.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold">{item.amount}</span>
                    <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}