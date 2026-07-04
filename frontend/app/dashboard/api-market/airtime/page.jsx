"use client";

import { useState } from "react";
import {
  Smartphone,
  Phone,
  CheckCircle,
  X,
  ShoppingCart,
} from "lucide-react";

import DashboardSidebar from "@/components/DashboardSidebar";
import api from "@/lib/api";
const networks = [
  { id: "MTN", name: "MTN", discount: "2%" },
  { id: "Airtel", name: "Airtel", discount: "2%" },
  { id: "Glo", name: "Glo", discount: "2%" },
  { id: "9mobile", name: "9mobile", discount: "2%" },
];

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function AirtimeMarketplacePage() {
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const confirmPurchase = async () => {
  try {
    const res = await api.post("/marketplace/airtime/buy", {
      network: selectedNetwork.name,
      phone,
      amount,
    });

    alert(res.data.message || "Airtime purchase created successfully");

    setSelectedNetwork(null);
    setPhone("");
    setAmount("");
  } catch (error) {
    alert(error.response?.data?.message || "Airtime purchase failed");
  }
};
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="airtime" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-5">
              <Smartphone size={16} />
              Airtime Marketplace
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold">
              Buy Airtime
            </h1>

            <p className="text-slate-400 mt-3">
              Purchase airtime for MTN, Airtel, Glo and 9mobile directly from your wallet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {networks.map((network) => (
              <div
                key={network.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500 transition"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>

                  <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                    ACTIVE
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold">
                  {network.name}
                </h2>

                <p className="text-slate-400 mt-1">
                  Airtime Recharge
                </p>

                <div className="mt-6">
                  <p className="text-slate-400 text-sm">Developer Discount</p>
                  <h3 className="text-3xl font-extrabold mt-1">
                    {network.discount}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedNetwork(network)}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Buy Airtime
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {selectedNetwork && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                Confirm Airtime Purchase
              </h2>

              <button
                onClick={() => setSelectedNetwork(null)}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <ReadOnly label="Network" value={selectedNetwork.name} />

              <div>
                <label className="text-sm text-slate-400">Phone Number</label>
                <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                  <Phone size={18} className="text-slate-500" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((item) => (
                  <button
                    key={item}
                    onClick={() => setAmount(item)}
                    className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-sm"
                  >
                    {formatNaira(item)}
                  </button>
                ))}
              </div>

              <button
                onClick={confirmPurchase}
                disabled={!phone || !amount}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value || ""}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none cursor-not-allowed"
      />
    </div>
  );
}