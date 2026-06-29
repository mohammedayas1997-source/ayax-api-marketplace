"use client";

import { useMemo, useState } from "react";
import {
  CircuitBoard,
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  ShoppingCart,
  Search,
  BatteryCharging,
  Signal,
  Activity,
  LockKeyhole,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialSims = Array.from({ length: 32 }, (_, index) => {
  const slot = index + 1;

  return {
    id: `SIM-${slot}`,
    slot,
    name: `SIM ${slot}`,
    number: `080000000${String(slot).padStart(2, "0")}`,
    type: slot <= 16 ? "DATA" : "VTU",
    network:
      slot === 30 || slot === 31
        ? "GLO"
        : slot === 32
        ? "9mobile"
        : slot % 2 === 0
        ? "MTN"
        : "Airtel",
    balance: slot % 5 === 0 ? 250 : slot % 3 === 0 ? 800 : 2500,
    status: slot % 5 === 0 ? "Low Balance" : "Active",
    signal: slot % 4 === 0 ? "Weak" : "Strong",
    usage: slot * 17,
  };
});

const rechargePlans = [
  { name: "₦500 Recharge", amount: 500 },
  { name: "₦1,000 Recharge", amount: 1000 },
  { name: "₦2,000 Recharge", amount: 2000 },
  { name: "₦5,000 Recharge", amount: 5000 },
  { name: "₦10,000 Recharge", amount: 10000 },
];

export default function SuperGSMGatewayPage() {
  const [sims, setSims] = useState(initialSims);
  const [selectedSim, setSelectedSim] = useState(initialSims[0]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [networkFilter, setNetworkFilter] = useState("ALL");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);

  const SUPER_PIN = "123456";

  const filteredSims = useMemo(() => {
    const q = query.toLowerCase();

    return sims.filter((sim) => {
      const search =
        sim.name.toLowerCase().includes(q) ||
        sim.number.includes(q) ||
        sim.network.toLowerCase().includes(q) ||
        sim.type.toLowerCase().includes(q);

      const type = typeFilter === "ALL" || sim.type === typeFilter;
      const network = networkFilter === "ALL" || sim.network === networkFilter;

      return search && type && network;
    });
  }, [sims, query, typeFilter, networkFilter]);

  const stats = {
    total: sims.length,
    data: sims.filter((s) => s.type === "DATA").length,
    vtu: sims.filter((s) => s.type === "VTU").length,
    low: sims.filter((s) => s.balance < 1000).length,
  };

  const rechargeSim = () => {
    const plan = rechargePlans.find((p) => p.name === selectedPlan);

    if (!plan) {
      setMessage("Please select recharge plan.");
      return;
    }

    if (pin !== SUPER_PIN) {
      setMessage("Invalid Super Admin PIN.");
      return;
    }

    setSims((prev) =>
      prev.map((sim) =>
        sim.id === selectedSim.id
          ? {
              ...sim,
              balance: sim.balance + plan.amount,
              status: sim.balance + plan.amount < 1000 ? "Low Balance" : "Active",
            }
          : sim
      )
    );

    const updatedSim = {
      ...selectedSim,
      balance: selectedSim.balance + plan.amount,
      status: selectedSim.balance + plan.amount < 1000 ? "Low Balance" : "Active",
    };

    setSelectedSim(updatedSim);

    setHistory((prev) => [
      {
        id: Date.now(),
        sim: selectedSim.name,
        number: selectedSim.number,
        network: selectedSim.network,
        type: selectedSim.type,
        amount: plan.amount,
        date: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);

    setSelectedPlan("");
    setPin("");
    setMessage(`${selectedSim.name} recharged successfully.`);
  };

  const autoSelectBestSim = () => {
    const best = [...sims]
      .filter((sim) => sim.status === "Active" && sim.balance >= 1000)
      .sort((a, b) => b.balance - a.balance)[0];

    if (!best) {
      setMessage("No active SIM with enough balance.");
      return;
    }

    setSelectedSim(best);
    setMessage(`${best.name} selected automatically based on highest balance.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="GSM Gateway Control Center" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total SIMs" value={stats.total} icon={<CircuitBoard />} />
            <Stat title="Data SIMs" value={stats.data} icon={<Smartphone />} />
            <Stat title="VTU SIMs" value={stats.vtu} icon={<Wallet />} />
            <Stat title="Low Balance" value={stats.low} icon={<AlertTriangle />} />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_180px_180px_200px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search SIM, number, network or type..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="DATA">DATA</option>
                <option value="VTU">VTU</option>
              </select>

              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Networks</option>
                <option value="MTN">MTN</option>
                <option value="Airtel">Airtel</option>
                <option value="GLO">GLO</option>
                <option value="9mobile">9mobile</option>
              </select>

              <button
                onClick={autoSelectBestSim}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} />
                Auto Select
              </button>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1.25fr_0.75fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <CircuitBoard className="text-blue-400" />
                <h2 className="text-xl font-bold">GSM Gateway SIM Slots</h2>
              </div>

              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                }}
              >
                {filteredSims.map((sim) => (
                  <button
                    key={sim.id}
                    onClick={() => setSelectedSim(sim)}
                    className={`rounded-3xl p-4 border transition text-left ${
                      selectedSim.id === sim.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{sim.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          sim.type === "DATA"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-green-500/10 text-green-400"
                        }`}
                      >
                        {sim.type}
                      </span>
                    </div>

                    <NetworkLabel network={sim.network} />

                    <p className="text-slate-500 text-sm mt-2">{sim.number}</p>

                    <h4 className="text-2xl font-extrabold mt-3">
                      {formatNaira(sim.balance)}
                    </h4>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
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

                      <span
                        className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                          sim.signal === "Strong"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        <Signal size={13} />
                        {sim.signal}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <BatteryCharging className="text-blue-400" />
                  <h2 className="text-xl font-bold">Selected SIM Details</h2>
                </div>

                <div className="space-y-4">
                  <ReadOnly label="SIM Slot" value={selectedSim.name} />
                  <ReadOnly label="SIM Number" value={selectedSim.number} />
                  <ReadOnly label="Network" value={selectedSim.network} />
                  <ReadOnly label="SIM Type" value={selectedSim.type} />
                  <ReadOnly label="Balance" value={formatNaira(selectedSim.balance)} />
                  <ReadOnly label="Status" value={selectedSim.status} />
                  <ReadOnly label="Signal" value={selectedSim.signal} />
                  <ReadOnly label="Usage Count" value={selectedSim.usage} />
                </div>

                <p className="text-xs text-red-400 mt-4">
                  SIM number is locked. Staff cannot edit or replace company SIM numbers.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <ShoppingCart className="text-blue-400" />
                  <h2 className="text-xl font-bold">Recharge Company SIM</h2>
                </div>

                <label className="text-sm text-slate-400">Recharge Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
                >
                  <option value="">Choose plan</option>
                  {rechargePlans.map((plan) => (
                    <option key={plan.name} value={plan.name}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <label className="text-sm text-slate-400 block mt-4">
                  Super Admin PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 outline-none"
                />

                <button
                  onClick={rechargeSim}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Recharge {selectedSim.name}
                </button>

                <p className="text-xs text-slate-500 mt-4">Test PIN: 123456</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Activity className="text-blue-400" />
                  <h2 className="text-xl font-bold">Recharge History</h2>
                </div>

                {history.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    No recharge has been made yet.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                      >
                        <h3 className="font-bold">
                          {item.sim} - {formatNaira(item.amount)}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {item.number} • {item.network} • {item.type}
                        </p>

                        <p className="text-xs text-slate-600 mt-2">
                          {item.date}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <LockKeyhole className="text-blue-400" />
                  <h2 className="text-xl font-bold">Gateway Security</h2>
                </div>

                <div className="space-y-3 text-slate-400 leading-7">
                  <p>System automatically selects the best SIM based on balance.</p>
                  <p>Only Super Admin can recharge company SIMs with PIN.</p>
                  <p>Staff can view SIM balance but cannot change SIM numbers.</p>
                  <p>Low balance SIMs must trigger live alerts later via Socket.IO.</p>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function NetworkLabel({ network }) {
  const color =
    network === "MTN"
      ? "bg-yellow-400"
      : network === "Airtel"
      ? "bg-red-500"
      : network === "GLO"
      ? "bg-green-500"
      : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span>{network}</span>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none cursor-not-allowed"
      />
    </div>
  );
}