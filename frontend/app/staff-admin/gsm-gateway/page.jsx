"use client";

import { socket } from "@/lib/socket";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  ShoppingCart,
  CircuitBoard,
  ShieldCheck,
  LogOut,
  Search,
  History,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialSims = Array.from({ length: 32 }, (_, index) => {
  const id = index + 1;

  return {
    id,
    name: `SIM ${id}`,
    number: `080000000${String(id).padStart(2, "0")}`,
    type: id <= 16 ? "DATA" : "VTU",
    balance: id % 5 === 0 ? 250 : id % 3 === 0 ? 800 : 2500,
    status: id % 5 === 0 || id % 3 === 0 ? "Low Balance" : "Active",
    network:
      id === 30 || id === 31
        ? "GLO"
        : id === 32
        ? "9mobile"
        : id % 2 === 0
        ? "MTN"
        : "Airtel",
  };
});

const plans = [
  { name: "₦500 Recharge", amount: 500 },
  { name: "₦1,000 Recharge", amount: 1000 },
  { name: "₦2,000 Recharge", amount: 2000 },
  { name: "₦5,000 Recharge", amount: 5000 },
  { name: "₦10,000 Recharge", amount: 10000 },
];

export default function GSMGatewayPage() {
  const [sims, setSims] = useState(initialSims);
  const [selectedSim, setSelectedSim] = useState(initialSims[0]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [companyWallet, setCompanyWallet] = useState(850000);
  const [searchTerm, setSearchTerm] = useState("");
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lowBalanceSims = sims.filter((sim) => sim.balance < 1000);

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

  const handleAutoSelectSim = () => {
    const bestSim =
      sims
        .filter((sim) => sim.status === "Active")
        .sort((a, b) => b.balance - a.balance)[0] || sims[0];

    setSelectedSim(bestSim);
    setMessage(
      `Auto selected ${bestSim.name} with ${formatNaira(bestSim.balance)} balance.`
    );
  };

  socket.on("gsm-low-balance",()=>{
   fetchGatewaySims();
});

socket.on("gsm-balance-updated",()=>{
   fetchGatewaySims();
});

  const handleBuyPlan = () => {
    const plan = plans.find((item) => item.name === selectedPlan);

    if (!plan) {
      setMessage("Please select a recharge plan first.");
      return;
    }

    if (companyWallet < plan.amount) {
      setMessage("Company wallet balance is not enough for this recharge.");
      return;
    }

    const updatedSims = sims.map((sim) => {
      if (sim.id !== selectedSim.id) return sim;

      const newBalance = sim.balance + plan.amount;

      return {
        ...sim,
        balance: newBalance,
        status: newBalance < 1000 ? "Low Balance" : "Active",
      };
    });

    const updatedSelectedSim = updatedSims.find(
      (sim) => sim.id === selectedSim.id
    );

    setSims(updatedSims);
    setSelectedSim(updatedSelectedSim);
    setCompanyWallet((prev) => prev - plan.amount);

    setRechargeHistory((prev) => [
      {
        id: Date.now(),
        sim: selectedSim.name,
        number: selectedSim.number,
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
        <StaffSidebar onLogout={handleLogout} />

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-800">
              <StaffSidebarContent
                onLogout={handleLogout}
                onClose={() => setSidebarOpen(false)}
                mobile
              />
            </div>
          </div>
        )}

        <section className="flex-1 p-6 lg:p-10 overflow-x-hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mb-6 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-2"
          >
            <Menu size={18} />
            Open Menu
          </button>

          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <CircuitBoard />
              <span className="font-semibold">Staff Admin Control</span>
            </div>

            <h1 className="text-3xl font-extrabold">
              GSM Gateway SIM Management
            </h1>

            <p className="text-slate-400 mt-2">
              Monitor 32 GSM Gateway SIMs, balances, low balance alerts, and
              purchase company recharge plans securely.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
  className="grid gap-4 mb-8"
  style={{
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  }}
>
            <StatCard
              title="Company Wallet"
              value={formatNaira(companyWallet)}
              icon={<Wallet />}
              desc="View only. Staff cannot withdraw."
            />
            <StatCard
              title="Total SIMs"
              value="32"
              icon={<Smartphone />}
              desc="Gateway SIM slots"
            />
            <StatCard
              title="Low Balance SIMs"
              value={lowBalanceSims.length}
              icon={<AlertTriangle />}
              desc="Need recharge"
            />
            <StatCard
              title="Auto SIM Mode"
              value="Active"
              icon={<RefreshCcw />}
              desc="System selects SIM automatically"
            />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck />
              </div>

              <div>
                <h2 className="text-xl font-bold">Staff Permission Rules</h2>
                <p className="text-slate-400 mt-2 leading-7">
                  Staff can view company wallet balance and buy recharge plans
                  for company SIMs only. Staff cannot withdraw company money and
                  cannot change SIM numbers. SIM selection is handled
                  automatically by the system.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <h2 className="text-xl font-bold">GSM Gateway SIM Slots</h2>

              <button
                onClick={handleAutoSelectSim}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} />
                Auto Select Best SIM
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
              <Search size={18} className="text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SIM, number, network or type..."
                className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />
            </div>

            <div
  className="grid gap-4"
  style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
>
              {filteredSims.map((sim) => (
                <button
                  key={sim.id}
                  onClick={() => setSelectedSim(sim)}
                  className={`rounded-3xl p-4 border transition min-h-[190px] flex flex-col items-center justify-center text-center ${
                    selectedSim.id === sim.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-blue-500"
                  }`}
                >
                  <div
                    className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 ${
                      sim.network === "MTN"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : sim.network === "Airtel"
                        ? "bg-red-500/20 text-red-400"
                        : sim.network === "GLO"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    <Smartphone size={34} />
                  </div>

                  <h3 className="font-extrabold text-lg">{sim.name}</h3>

                  <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mt-2">
                    {sim.network === "MTN" && (
                      <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    )}
                    {sim.network === "Airtel" && (
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                    )}
                    {sim.network === "GLO" && (
                      <span className="w-3 h-3 rounded-full bg-green-500" />
                    )}
                    {sim.network === "9mobile" && (
                      <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    )}
                    <span>{sim.network}</span>
                  </div>

                  <span
                    className={`mt-3 text-xs px-3 py-1 rounded-full ${
                      sim.type === "DATA"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {sim.type}
                  </span>

                  <h4 className="text-lg font-bold mt-3">
                    {formatNaira(sim.balance)}
                  </h4>

                  <span
                    className={`inline-flex items-center gap-1 mt-3 text-xs px-3 py-1 rounded-full ${
                      sim.status === "Active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {sim.status === "Active" ? (
                      <CheckCircle size={13} />
                    ) : (
                      <AlertTriangle size={13} />
                    )}
                    {sim.status}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid xl:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Selected SIM Details</h2>

              <div className="space-y-4">
                <ReadOnlyField label="SIM Slot" value={selectedSim.name} />
                <ReadOnlyField label="SIM Number" value={selectedSim.number} />
                <ReadOnlyField label="SIM Type" value={selectedSim.type} />
                <ReadOnlyField label="Network" value={selectedSim.network} />
                <ReadOnlyField
                  label="Balance"
                  value={formatNaira(selectedSim.balance)}
                />
              </div>

              <p className="text-xs text-red-400 mt-4">
                SIM number is locked. Staff cannot edit or replace this number.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">
                Buy Plan for Company SIM
              </h2>

              <label className="text-sm text-slate-300">
                Select Recharge Plan
              </label>

              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none text-white"
              >
                <option value="">Choose plan</option>
                {plans.map((plan) => (
                  <option key={plan.name} value={plan.name}>
                    {plan.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleBuyPlan}
                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                Buy Plan for {selectedSim.name}
              </button>

              <p className="text-slate-500 text-xs mt-4 leading-6">
                Payment will be deducted from company wallet only for recharge
                purchase. Withdrawal is disabled for staff.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <History className="text-blue-400" />
                <h2 className="text-xl font-bold">Recharge History</h2>
              </div>

              {rechargeHistory.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No recharge has been made yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {rechargeHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {item.plan} - {item.sim}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {item.number} • {item.type}
                          </p>
                        </div>

                        <span className="font-bold">
                          {formatNaira(item.amount)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-2">
                        {item.date}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function StaffSidebar({ onLogout }) {
  return (
    <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
      <StaffSidebarContent onLogout={onLogout} />
    </aside>
  );
}

function StaffSidebarContent({ onLogout, onClose, mobile = false }) {
  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/staff-admin/gsm-gateway"
          className="text-2xl font-extrabold"
        >
          Ayax <span className="text-blue-500">Staff</span>
        </Link>

        {mobile && (
          <button onClick={onClose} className="text-slate-400">
            <X size={22} />
          </button>
        )}
      </div>

      <nav className="space-y-3 text-slate-300 flex-1">
        <Link
          href="/staff-admin/gsm-gateway"
          className="flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl"
        >
          <CircuitBoard size={18} />
          GSM Gateway
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

        <Link
          href="/staff-admin/gsm-gateway"
          className="flex items-center gap-3 hover:bg-slate-800 px-4 py-3 rounded-xl"
        >
          <AlertTriangle size={18} />
          Low Balance Alerts
        </Link>
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-3 rounded-xl"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
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