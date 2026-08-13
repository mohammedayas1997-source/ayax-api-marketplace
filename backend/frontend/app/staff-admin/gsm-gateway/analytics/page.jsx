"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  CircuitBoard,
  Database,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  ShoppingCart,
  Smartphone,
  Wallet,
} from "lucide-react";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialSims = Array.from({ length: 32 }, (_, index) => {
  const id = index + 1;

  return {
    id,
    name: `SIM ${id}`,
    number: `080000000${String(id).padStart(2, "0")}`,
    type: id <= 16 ? "DATA" : "VTU",
    network:
      id === 30 || id === 31
        ? "GLO"
        : id === 32
        ? "9mobile"
        : id % 2 === 0
        ? "MTN"
        : "Airtel",
    balance: id % 5 === 0 ? 250 : id % 3 === 0 ? 800 : 2500,
    usageCount: id * 11,
    spend: id * 120,
    success: id % 4 === 0 ? 94 : 98,
  };
});

const dataPlans = [
  { name: "1GB Data Bundle", amount: 350, type: "DATA" },
  { name: "2GB Data Bundle", amount: 700, type: "DATA" },
  { name: "5GB Data Bundle", amount: 1600, type: "DATA" },
];

const vtuPlans = [
  { name: "₦500 VTU Airtime", amount: 500, type: "VTU" },
  { name: "₦1,000 VTU Airtime", amount: 1000, type: "VTU" },
  { name: "₦5,000 VTU Airtime", amount: 5000, type: "VTU" },
];

export default function GSMAnalyticsPage() {
  const [sims, setSims] = useState(initialSims);
  const [companyWallet, setCompanyWallet] = useState(850000);
  const [selectedSimId, setSelectedSimId] = useState(initialSims[0].id);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");

  const selectedSim = sims.find((sim) => sim.id === selectedSimId) || sims[0];

  const availablePlans =
    selectedSim.type === "DATA" ? dataPlans : vtuPlans;

  const filteredSims = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return sims.filter(
      (sim) =>
        sim.name.toLowerCase().includes(query) ||
        sim.number.toLowerCase().includes(query) ||
        sim.network.toLowerCase().includes(query) ||
        sim.type.toLowerCase().includes(query)
    );
  }, [sims, searchTerm]);

  const analytics = useMemo(() => {
    const dataSims = sims.filter((sim) => sim.type === "DATA");
    const vtuSims = sims.filter((sim) => sim.type === "VTU");
    const totalSpend = sims.reduce((sum, sim) => sum + sim.spend, 0);
    const totalUsage = sims.reduce((sum, sim) => sum + sim.usageCount, 0);
    const lowBalance = sims.filter((sim) => sim.balance < 1000).length;
    const averageSuccess =
      sims.reduce((sum, sim) => sum + sim.success, 0) / sims.length;

    return {
      dataSims: dataSims.length,
      vtuSims: vtuSims.length,
      totalSpend,
      totalUsage,
      lowBalance,
      averageSuccess: averageSuccess.toFixed(1),
    };
  }, [sims]);

  const handleBuyPlan = () => {
    const allPlans = [...dataPlans, ...vtuPlans];
    const plan = allPlans.find((item) => item.name === selectedPlan);

    if (!plan) {
      setMessage("Please select a plan first.");
      return;
    }

    if (plan.type !== selectedSim.type) {
      setMessage(`This plan is only for ${plan.type} SIMs.`);
      return;
    }

    if (companyWallet < plan.amount) {
      setMessage("Company wallet balance is not enough.");
      return;
    }

    const updatedSims = sims.map((sim) => {
      if (sim.id !== selectedSim.id) return sim;

      return {
        ...sim,
        balance: sim.balance + plan.amount,
        usageCount: sim.usageCount + 1,
        spend: sim.spend + plan.amount,
        success: Math.min(100, sim.success + 0.1),
      };
    });

    setSims(updatedSims);
    setCompanyWallet((prev) => prev - plan.amount);
    setHistory((prev) => [
      {
        id: Date.now(),
        sim: selectedSim.name,
        number: selectedSim.number,
        network: selectedSim.network,
        type: selectedSim.type,
        plan: plan.name,
        amount: plan.amount,
        date: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);

    setSelectedPlan("");
    setMessage(`${plan.name} purchased successfully for ${selectedSim.name}.`);
  };

  const handleLogout = () => {
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
          <Link href="/staff-admin/gsm-gateway" className="text-2xl font-extrabold mb-10">
            Ayax <span className="text-blue-500">Staff</span>
          </Link>

          <nav className="space-y-3 text-slate-300 flex-1">
            <Link
              href="/staff-admin/gsm-gateway"
              className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-xl"
            >
              <CircuitBoard size={18} />
              GSM Gateway
            </Link>

            <Link
              href="/staff-admin/gsm-gateway/analytics"
              className="flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl"
            >
              <BarChart3 size={18} />
              GSM Analytics
            </Link>

            <Link
              href="/staff-admin/gsm-gateway"
              className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-xl"
            >
              <LayoutDashboard size={18} />
              Staff Dashboard
            </Link>

            <Link
              href="/staff-admin/gsm-gateway"
              className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-xl"
            >
              <Wallet size={18} />
              Company Wallet
            </Link>
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-3 rounded-xl"
          >
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <BarChart3 />
              <span className="font-semibold">GSM Gateway Analytics</span>
            </div>

            <h1 className="text-3xl font-extrabold">
              Data & VTU Performance Analytics
            </h1>

            <p className="text-slate-400 mt-2">
              Track SIM usage, Data movement, VTU transactions, company wallet
              deductions and SIM performance.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Company Wallet"
              value={formatNaira(companyWallet)}
              icon={<Wallet />}
              desc="Staff can buy plans only."
            />

            <StatCard
              title="Total Usage"
              value={analytics.totalUsage}
              icon={<Activity />}
              desc="Data + VTU requests"
            />

            <StatCard
              title="Total Spend"
              value={formatNaira(analytics.totalSpend)}
              icon={<ShoppingCart />}
              desc="All SIM purchases"
            />

            <StatCard
              title="Avg Success Rate"
              value={`${analytics.averageSuccess}%`}
              icon={<CheckCircle />}
              desc="Across all SIMs"
            />
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Data SIMs"
              value={analytics.dataSims}
              icon={<Database />}
              desc="SIM 1 - SIM 16"
            />

            <StatCard
              title="VTU SIMs"
              value={analytics.vtuSims}
              icon={<Smartphone />}
              desc="SIM 17 - SIM 32"
            />

            <StatCard
              title="Low Balance"
              value={analytics.lowBalance}
              icon={<AlertTriangle />}
              desc="Below ₦1,000"
            />

            <StatCard
              title="Transactions"
              value={history.length}
              icon={<History />}
              desc="Live session history"
            />
          </section>

          <section className="grid xl:grid-cols-[1.3fr_0.7fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <h2 className="text-xl font-bold">
                  SIM Performance Analysis
                </h2>

                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                  <Search size={18} className="text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search SIM..."
                    className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredSims.map((sim) => (
                  <button
                    key={sim.id}
                    onClick={() => setSelectedSimId(sim.id)}
                    className={`rounded-3xl p-4 border transition text-center ${
                      selectedSimId === sim.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-blue-500"
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto bg-blue-600/20 rounded-3xl flex items-center justify-center mb-4">
                      <Smartphone className="text-blue-400" />
                    </div>

                    <h3 className="font-bold">{sim.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {sim.network} • {sim.type}
                    </p>

                    <div className="mt-4 text-left space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Usage</span>
                        <span>{sim.usageCount}</span>
                      </p>

                      <p className="flex justify-between">
                        <span className="text-slate-500">Spend</span>
                        <span>{formatNaira(sim.spend)}</span>
                      </p>

                      <p className="flex justify-between">
                        <span className="text-slate-500">Success</span>
                        <span>{sim.success}%</span>
                      </p>

                      <p className="flex justify-between">
                        <span className="text-slate-500">Balance</span>
                        <span>{formatNaira(sim.balance)}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5">
                  Selected SIM Control
                </h2>

                <div className="space-y-4">
                  <ReadOnlyField label="SIM Slot" value={selectedSim.name} />
                  <ReadOnlyField label="SIM Number" value={selectedSim.number} />
                  <ReadOnlyField label="Network" value={selectedSim.network} />
                  <ReadOnlyField label="SIM Type" value={selectedSim.type} />
                  <ReadOnlyField label="Balance" value={formatNaira(selectedSim.balance)} />
                  <ReadOnlyField label="Usage Count" value={selectedSim.usageCount} />
                  <ReadOnlyField label="Success Rate" value={`${selectedSim.success}%`} />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5">
                  Buy {selectedSim.type} Plan
                </h2>

                <label className="text-sm text-slate-300">
                  Select Plan
                </label>

                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none text-white"
                >
                  <option value="">Choose plan</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.name} value={plan.name}>
                      {plan.name} — {formatNaira(plan.amount)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleBuyPlan}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Buy for {selectedSim.name}
                </button>

                <p className="text-slate-500 text-xs mt-4 leading-6">
                  Staff can buy company Data/VTU plans only. Withdrawal and SIM
                  number editing are disabled.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <History className="text-blue-400" />
                  <h2 className="text-xl font-bold">Live Purchase History</h2>
                </div>

                {history.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    No purchase has been made yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                      >
                        <h3 className="font-semibold">
                          {item.plan} - {item.sim}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          {item.number} • {item.network} • {item.type}
                        </p>

                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold">
                            {formatNaira(item.amount)}
                          </span>

                          <span className="text-xs text-slate-500">
                            {item.date}
                          </span>
                        </div>
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

function StatCard({ title, value, icon, desc }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-5">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
      <p className="text-slate-500 text-sm mt-3">{desc}</p>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none text-white cursor-not-allowed"
      />
    </div>
  );
}