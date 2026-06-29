"use client";

import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { ShoppingCart, Wifi, Smartphone, Wallet } from "lucide-react";

const STORAGE_KEY = "ayax_api_plans";

const defaultPlans = [
  {
    id: "PLAN-1001",
    name: "MTN SME 1GB",
    provider: "MTN",
    category: "DATA",
    sellingPrice: 280,
    status: "ACTIVE",
  },
];

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

function loadPlans() {
  if (typeof window === "undefined") return defaultPlans;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultPlans;
}

export default function CustomerApiMarketPage() {
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(50000);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);

  const fetchPlans = () => {
    const activePlans = loadPlans().filter((p) => p.status === "ACTIVE");
    setPlans(activePlans);
  };

  useEffect(() => {
    fetchPlans();

    window.addEventListener("ayax-plans-updated", fetchPlans);
    window.addEventListener("storage", fetchPlans);

    return () => {
      window.removeEventListener("ayax-plans-updated", fetchPlans);
      window.removeEventListener("storage", fetchPlans);
    };
  }, []);

  const buyPlan = (plan) => {
    if (wallet < plan.sellingPrice) {
      setMessage("Insufficient wallet balance.");
      return;
    }

    setWallet((prev) => prev - Number(plan.sellingPrice));
    setHistory((prev) => [
      {
        id: Date.now(),
        plan: plan.name,
        amount: plan.sellingPrice,
        provider: plan.provider,
        category: plan.category,
        date: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);
    setMessage(`${plan.name} purchased successfully.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="api-market" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <ShoppingCart />
              <span className="font-semibold">Customer API Marketplace</span>
            </div>

            <h1 className="text-3xl font-extrabold">API Plans</h1>
            <p className="text-slate-400 mt-2">
              Plans published by Admin will appear here live.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section className="grid grid-cols-4 gap-5 mb-8">
            <Stat title="Wallet Balance" value={formatNaira(wallet)} />
            <Stat title="Available Plans" value={plans.length} />
            <Stat title="Purchases" value={history.length} />
            <Stat title="Status" value="Live" />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
                  {plan.category === "DATA" ? <Wifi /> : <Smartphone />}
                </div>

                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="text-slate-500 mt-2">
                  {plan.provider} • {plan.category}
                </p>

                <h3 className="text-3xl font-extrabold mt-5">
                  {formatNaira(plan.sellingPrice)}
                </h3>

                <button
                  onClick={() => buyPlan(plan)}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Buy Now
                </button>
              </div>
            ))}
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Wallet className="text-blue-400" />
              <h2 className="text-xl font-bold">Purchase History</h2>
            </div>

            {history.length === 0 ? (
              <p className="text-slate-500">No purchase yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex justify-between"
                  >
                    <div>
                      <h3 className="font-bold">{item.plan}</h3>
                      <p className="text-sm text-slate-500">
                        {item.provider} • {item.category} • {item.date}
                      </p>
                    </div>

                    <span className="font-bold">
                      {formatNaira(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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