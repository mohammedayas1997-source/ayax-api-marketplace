"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import {
  PlusCircle,
  Save,
  Trash2,
  Power,
  Database,
  Wifi,
} from "lucide-react";

const STORAGE_KEY = "ayax_api_plans";

const defaultPlans = [
  {
    id: "PLAN-1001",
    name: "MTN SME 1GB",
    provider: "MTN",
    category: "DATA",
    costPrice: 250,
    sellingPrice: 280,
    endpoint: "/api/v1/data/buy",
    status: "ACTIVE",
  },
  {
    id: "PLAN-1002",
    name: "Airtel VTU ₦1000",
    provider: "Airtel",
    category: "VTU",
    costPrice: 970,
    sellingPrice: 1000,
    endpoint: "/api/v1/airtime/buy",
    status: "ACTIVE",
  },
];

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

function loadPlans() {
  if (typeof window === "undefined") return defaultPlans;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultPlans;
}

function savePlans(plans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  window.dispatchEvent(new Event("ayax-plans-updated"));
}

export default function AdminApiPlansPage() {
  const [plans, setPlans] = useState(loadPlans);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    provider: "MTN",
    category: "DATA",
    costPrice: "",
    sellingPrice: "",
    endpoint: "/api/v1/data/buy",
  });

  const totalActive = plans.filter((p) => p.status === "ACTIVE").length;
  const totalProfit = useMemo(
    () =>
      plans.reduce(
        (sum, p) => sum + (Number(p.sellingPrice) - Number(p.costPrice)),
        0
      ),
    [plans]
  );

  const updatePlans = (next) => {
    setPlans(next);
    savePlans(next);
  };

  const createPlan = () => {
    if (!form.name || !form.costPrice || !form.sellingPrice) {
      setMessage("Please fill plan name, cost price and selling price.");
      return;
    }

    const newPlan = {
      id: `PLAN-${Date.now()}`,
      ...form,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      status: "ACTIVE",
    };

    updatePlans([newPlan, ...plans]);
    setForm({
      name: "",
      provider: "MTN",
      category: "DATA",
      costPrice: "",
      sellingPrice: "",
      endpoint: "/api/v1/data/buy",
    });
    setMessage("API plan created and sent to customer dashboard.");
  };

  const toggleStatus = (id) => {
    const next = plans.map((p) =>
      p.id === id
        ? { ...p, status: p.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }
        : p
    );
    updatePlans(next);
    setMessage("Plan status updated live.");
  };

  const deletePlan = (id) => {
    updatePlans(plans.filter((p) => p.id !== id));
    setMessage("Plan deleted live.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="api-plans" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Database />
              <span className="font-semibold">Admin API Plans Control</span>
            </div>
            <h1 className="text-3xl font-extrabold">API Plans Manager</h1>
            <p className="text-slate-400 mt-2">
              Create plans here and publish them live to customer dashboard.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section className="grid grid-cols-4 gap-5 mb-8">
            <Stat title="Total Plans" value={plans.length} />
            <Stat title="Active Plans" value={totalActive} />
            <Stat title="Disabled" value={plans.length - totalActive} />
            <Stat title="Total Profit" value={formatNaira(totalProfit)} />
          </section>

          <section className="grid xl:grid-cols-[0.8fr_1.2fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Create New Plan</h2>

              <div className="space-y-4">
                <Input
                  label="Plan Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="MTN SME 1GB"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Provider"
                    value={form.provider}
                    onChange={(v) => setForm({ ...form, provider: v })}
                    options={["MTN", "Airtel", "GLO", "9mobile"]}
                  />

                  <Select
                    label="Category"
                    value={form.category}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        category: v,
                        endpoint:
                          v === "DATA"
                            ? "/api/v1/data/buy"
                            : "/api/v1/airtime/buy",
                      })
                    }
                    options={["DATA", "VTU", "AIRTIME", "VERIFY", "UTILITY"]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cost Price"
                    value={form.costPrice}
                    onChange={(v) => setForm({ ...form, costPrice: v })}
                    placeholder="250"
                    type="number"
                  />
                  <Input
                    label="Selling Price"
                    value={form.sellingPrice}
                    onChange={(v) => setForm({ ...form, sellingPrice: v })}
                    placeholder="280"
                    type="number"
                  />
                </div>

                <Input
                  label="API Endpoint"
                  value={form.endpoint}
                  onChange={(v) => setForm({ ...form, endpoint: v })}
                  placeholder="/api/v1/data/buy"
                />

                <button
                  onClick={createPlan}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  Publish Plan
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Published API Plans</h2>

              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{plan.name}</h3>
                        <p className="text-sm text-slate-500">
                          {plan.provider} • {plan.category} • {plan.endpoint}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          Cost: {formatNaira(plan.costPrice)} | Selling:{" "}
                          {formatNaira(plan.sellingPrice)} | Profit:{" "}
                          {formatNaira(plan.sellingPrice - plan.costPrice)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(plan.id)}
                          className={`p-3 rounded-xl ${
                            plan.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          <Power size={18} />
                        </button>

                        <button
                          onClick={() => deletePlan(plan.id)}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-3 rounded-xl"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <span
                      className={`inline-flex mt-4 px-3 py-1 rounded-full text-xs ${
                        plan.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}