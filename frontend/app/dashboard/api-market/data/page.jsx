"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Wifi,
  ShoppingCart,
  Phone,
  X,
  CheckCircle,
} from "lucide-react";

import api from "@/lib/api";
import DashboardSidebar from "@/components/DashboardSidebar";

const fallbackPlans = [
  { id: 1, network: "MTN", size: "500MB", price: 220, status: "ACTIVE" },
  { id: 2, network: "MTN", size: "1GB", price: 430, status: "ACTIVE" },
  { id: 3, network: "MTN", size: "2GB", price: 820, status: "ACTIVE" },
  { id: 4, network: "MTN", size: "5GB", price: 1950, status: "ACTIVE" },
  { id: 5, network: "MTN", size: "10GB", price: 3800, status: "ACTIVE" },
  { id: 6, network: "MTN", size: "20GB", price: 7300, status: "ACTIVE" },
  { id: 7, network: "MTN", size: "50GB", price: 17500, status: "ACTIVE" },
  { id: 8, network: "MTN", size: "100GB", price: 34000, status: "ACTIVE" },
];

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function DataMarketplacePage() {
  const [plans, setPlans] = useState([]);
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("ALL");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/plans");
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error(err);
      setPlans(fallbackPlans);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const q = query.toLowerCase();

      const planNetwork = plan.network || plan.service?.category || "";
      const planSize = plan.size || plan.name || "";
      const planPrice = plan.price || plan.sellingPrice || 0;

      const matchesSearch =
        planNetwork.toLowerCase().includes(q) ||
        planSize.toLowerCase().includes(q) ||
        String(planPrice).includes(q);

      const matchesNetwork =
        network === "ALL" || planNetwork === network;

      return matchesSearch && matchesNetwork;
    });
  }, [plans, query, network]);

  const confirmPurchase = () => {
    alert(
      `Purchase request created:\n${selectedPlan.network || selectedPlan.service?.category} ${
        selectedPlan.size || selectedPlan.name
      }\nPhone: ${phone}`
    );

    setSelectedPlan(null);
    setPhone("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="api-market" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-4 py-2 rounded-full mb-5">
              <Wifi size={16} />
              Data Marketplace
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold">
              Buy Data Plans
            </h1>

            <p className="text-slate-400 mt-3">
              Browse data plans from 500MB to 100GB across MTN, Airtel, Glo and 9mobile.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by network, size or price..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
              >
                <option value="ALL">All Networks</option>
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
                <option value="Glo">Glo</option>
                <option value="9mobile">9mobile</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading data plans...</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {filteredPlans.map((plan) => {
                const planNetwork = plan.network || plan.service?.category || "Data";
                const planSize = plan.size || plan.name || "Plan";
                const planPrice = plan.price || plan.sellingPrice || 0;

                return (
                  <div
                    key={plan.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500 transition"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center">
                        <Wifi size={24} />
                      </div>

                      <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                        {plan.status}
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold">{planNetwork}</h2>
                    <p className="text-slate-400 mt-1">Data Bundle</p>

                    <div className="mt-6">
                      <p className="text-slate-400 text-sm">Plan Size</p>
                      <h3 className="text-3xl font-extrabold mt-1">
                        {planSize}
                      </h3>
                    </div>

                    <div className="mt-5">
                      <p className="text-slate-400 text-sm">Price</p>
                      <h3 className="text-2xl font-bold text-blue-400 mt-1">
                        {formatNaira(planPrice)}
                      </h3>
                    </div>

                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      Buy Plan
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Confirm Data Purchase</h2>

              <button
                onClick={() => setSelectedPlan(null)}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <ReadOnly
                label="Network"
                value={selectedPlan.network || selectedPlan.service?.category || "Data"}
              />
              <ReadOnly
                label="Plan"
                value={selectedPlan.size || selectedPlan.name}
              />
              <ReadOnly
                label="Amount"
                value={formatNaira(selectedPlan.price || selectedPlan.sellingPrice)}
              />

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

              <button
                onClick={confirmPurchase}
                disabled={!phone}
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