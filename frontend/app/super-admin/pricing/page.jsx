"use client";

import { useMemo, useState } from "react";
import {
  Tags,
  PlusCircle,
  Search,
  Save,
  Trash2,
  Power,
  LockKeyhole,
  Download,
  Wifi,
  Smartphone,
  Tv,
  Zap,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialPlans = [
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
    category: "AIRTIME",
    costPrice: 970,
    sellingPrice: 1000,
    endpoint: "/api/v1/airtime/buy",
    status: "ACTIVE",
  },
  {
    id: "PLAN-1003",
    name: "DSTV Compact",
    provider: "DSTV",
    category: "CABLE",
    costPrice: 15000,
    sellingPrice: 15500,
    endpoint: "/api/v1/cable/pay",
    status: "DISABLED",
  },
];

export default function SuperPricingPage() {
  const [plans, setPlans] = useState(initialPlans);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const SUPER_PIN = "123456";

  const [form, setForm] = useState({
    name: "",
    provider: "MTN",
    category: "DATA",
    costPrice: "",
    sellingPrice: "",
    endpoint: "/api/v1/data/buy",
  });

  const filteredPlans = useMemo(() => {
    const q = query.toLowerCase();

    return plans.filter((plan) => {
      const search =
        plan.name.toLowerCase().includes(q) ||
        plan.provider.toLowerCase().includes(q) ||
        plan.category.toLowerCase().includes(q) ||
        plan.endpoint.toLowerCase().includes(q);

      const category =
        categoryFilter === "ALL" || plan.category === categoryFilter;

      return search && category;
    });
  }, [plans, query, categoryFilter]);

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.status === "ACTIVE").length,
    disabled: plans.filter((p) => p.status === "DISABLED").length,
    profit: plans.reduce(
      (sum, p) => sum + (Number(p.sellingPrice) - Number(p.costPrice)),
      0
    ),
  };

  const createPlan = () => {
    if (pin !== SUPER_PIN) {
      setMessage("Invalid Super Admin PIN.");
      return;
    }

    if (!form.name || !form.costPrice || !form.sellingPrice || !form.endpoint) {
      setMessage("Please fill all required fields.");
      return;
    }

    const newPlan = {
      id: `PLAN-${Date.now()}`,
      ...form,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      status: "ACTIVE",
    };

    setPlans((prev) => [newPlan, ...prev]);
    setForm({
      name: "",
      provider: "MTN",
      category: "DATA",
      costPrice: "",
      sellingPrice: "",
      endpoint: "/api/v1/data/buy",
    });
    setPin("");
    setMessage("API plan created and pushed to customer dashboard.");
  };

  const toggleStatus = (id) => {
    if (pin !== SUPER_PIN) {
      setMessage("Enter Super Admin PIN before changing plan status.");
      return;
    }

    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              status: plan.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
            }
          : plan
      )
    );

    setMessage("Plan status updated successfully.");
  };

  const deletePlan = (id) => {
    if (pin !== SUPER_PIN) {
      setMessage("Enter Super Admin PIN before deleting plan.");
      return;
    }

    setPlans((prev) => prev.filter((plan) => plan.id !== id));
    setMessage("Plan deleted successfully.");
  };

  const updateEndpointByCategory = (category) => {
    const endpoints = {
      DATA: "/api/v1/data/buy",
      AIRTIME: "/api/v1/airtime/buy",
      VTU: "/api/v1/vtu/buy",
      CABLE: "/api/v1/cable/pay",
      ELECTRICITY: "/api/v1/electricity/pay",
      VERIFY: "/api/v1/verify/check",
    };

    setForm({
      ...form,
      category,
      endpoint: endpoints[category] || "/api/v1/data/buy",
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="API Pricing & Plans Manager" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Plans" value={stats.total} icon={<Tags />} />
            <Stat title="Active Plans" value={stats.active} icon={<Power />} />
            <Stat title="Disabled" value={stats.disabled} icon={<AlertTriangle />} />
            <Stat title="Total Profit" value={formatNaira(stats.profit)} icon={<ShieldCheck />} />
          </section>

          <section className="grid xl:grid-cols-[0.85fr_1.15fr] gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <PlusCircle className="text-blue-400" />
                  <h2 className="text-xl font-bold">Create API Plan</h2>
                </div>

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
                      options={[
                        "MTN",
                        "Airtel",
                        "GLO",
                        "9mobile",
                        "DSTV",
                        "GOTV",
                        "PHCN",
                        "WAEC",
                        "JAMB",
                      ]}
                    />

                    <Select
                      label="Category"
                      value={form.category}
                      onChange={updateEndpointByCategory}
                      options={[
                        "DATA",
                        "AIRTIME",
                        "VTU",
                        "CABLE",
                        "ELECTRICITY",
                        "VERIFY",
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Cost Price"
                      type="number"
                      value={form.costPrice}
                      onChange={(v) => setForm({ ...form, costPrice: v })}
                      placeholder="250"
                    />

                    <Input
                      label="Selling Price"
                      type="number"
                      value={form.sellingPrice}
                      onChange={(v) => setForm({ ...form, sellingPrice: v })}
                      placeholder="280"
                    />
                  </div>

                  <Input
                    label="API Endpoint"
                    value={form.endpoint}
                    onChange={(v) => setForm({ ...form, endpoint: v })}
                    placeholder="/api/v1/data/buy"
                  />

                  <div>
                    <label className="text-sm text-slate-400">
                      Super Admin PIN
                    </label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter PIN"
                      className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                    />
                  </div>

                  <button
                    onClick={createPlan}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Publish Plan
                  </button>

                  <p className="text-xs text-slate-500">Test PIN: 123456</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <LockKeyhole className="text-blue-400" />
                  <h2 className="text-xl font-bold">Pricing Security</h2>
                </div>

                <div className="space-y-4 text-slate-400 leading-7">
                  <p>Only Super Admin can delete plans.</p>
                  <p>Admin can edit prices only if permission is granted.</p>
                  <p>Every price change must enter audit logs.</p>
                  <p>Plans published here will appear on customer dashboard.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Published API Plans</h2>
                  <p className="text-slate-400 mt-1">
                    Manage API plans, pricing, endpoints and customer visibility.
                  </p>
                </div>

                <button className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2">
                  <Download size={18} />
                  Export
                </button>
              </div>

              <div className="grid lg:grid-cols-[1fr_220px] gap-4 mb-6">
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                  <Search size={18} className="text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search plan, provider, category or endpoint..."
                    className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="DATA">DATA</option>
                  <option value="AIRTIME">AIRTIME</option>
                  <option value="VTU">VTU</option>
                  <option value="CABLE">CABLE</option>
                  <option value="ELECTRICITY">ELECTRICITY</option>
                  <option value="VERIFY">VERIFY</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
                          <PlanIcon category={plan.category} />
                        </div>

                        <div>
                          <h3 className="font-bold text-lg">{plan.name}</h3>

                          <p className="text-sm text-slate-500 mt-1">
                            {plan.provider} • {plan.category} • {plan.endpoint}
                          </p>

                          <div className="flex flex-wrap gap-3 mt-3 text-sm">
                            <span className="bg-slate-800 px-3 py-1 rounded-full">
                              Cost: {formatNaira(plan.costPrice)}
                            </span>

                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full">
                              Selling: {formatNaira(plan.sellingPrice)}
                            </span>

                            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full">
                              Profit:{" "}
                              {formatNaira(plan.sellingPrice - plan.costPrice)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-3 py-2 rounded-xl text-xs h-fit ${
                            plan.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {plan.status}
                        </span>

                        <button
                          onClick={() => toggleStatus(plan.id)}
                          className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl"
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
                  </div>
                ))}

                {filteredPlans.length === 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                    No API plan found.
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

function PlanIcon({ category }) {
  if (category === "DATA") return <Wifi />;
  if (category === "AIRTIME" || category === "VTU") return <Smartphone />;
  if (category === "CABLE") return <Tv />;
  if (category === "ELECTRICITY") return <Zap />;
  return <Tags />;
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