"use client";

import { useEffect, useState } from "react";
import {
  Tags,
  CheckCircle,
  XCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Edit,
  Trash2,
  Power,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const emptyForm = {
  serviceId: "",
  name: "",
  code: "",
  category: "",
  costPrice: "",
  sellingPrice: "",
  status: "ACTIVE",
  description: "",
};

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function ApiPlansPage() {
  const [plans, setPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const loadPlans = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;
      if (status !== "ALL") params.status = status;

      const [plansRes, statsRes, servicesRes] = await Promise.all([
        api.get("/api-plans", { params }),
        api.get("/api-plans/statistics"),
        api.get("/api-services"),
      ]);

      setPlans(plansRes.data.plans || []);
      setStats(statsRes.data.stats || {});
      setServices(servicesRes.data.services || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load API plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [status]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      serviceId: plan.serviceId || plan.service?.id || "",
      name: plan.name || "",
      code: plan.code || "",
      category: plan.category || "",
      costPrice: plan.costPrice || "",
      sellingPrice: plan.sellingPrice || "",
      status: plan.status || "ACTIVE",
      description: plan.description || "",
    });
    setFormOpen(true);
  };

  const submitPlan = async () => {
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
      };

      if (editing) {
        await api.patch(`/api-plans/${editing.id}`, payload);
        setMessage("API plan updated successfully.");
      } else {
        await api.post("/api-plans", payload);
        setMessage("API plan created successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save API plan.");
    }
  };

  const changeStatus = async (plan) => {
    try {
      const nextStatus = plan.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

      await api.patch(`/api-plans/${plan.id}/status`, {
        status: nextStatus,
      });

      setMessage(`Plan status changed to ${nextStatus}.`);
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update status.");
    }
  };

  const deletePlan = async (plan) => {
    if (!confirm(`Delete ${plan.name}?`)) return;

    try {
      await api.delete(`/api-plans/${plan.id}`);
      setMessage("API plan deleted successfully.");
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete API plan.");
    }
  };

  const profit = (plan) =>
    Number(plan.sellingPrice || 0) - Number(plan.costPrice || 0);

  if (loading) {
    return (
      <DashboardLayout title="API Plans">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Plans"
      description="Manage API plans, prices, margins and status."
    >
      {message && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
          {message}
        </div>
      )}

      <div className="mb-8">
        <KpiGrid
          items={[
            {
              title: "Total Plans",
              value: stats.total || plans.length,
              icon: <Tags />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ||
                plans.filter((p) => p.status === "ACTIVE").length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ||
                plans.filter((p) => p.status !== "ACTIVE").length,
              icon: <XCircle />,
              color: "red",
            },
            {
              title: "Avg Profit",
              value:
                plans.length > 0
                  ? formatNaira(
                      plans.reduce((sum, p) => sum + profit(p), 0) /
                        plans.length
                    )
                  : formatNaira(0),
              icon: <TrendingUp />,
              color: "purple",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid lg:grid-cols-[1fr_220px_auto_auto] gap-4">
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name, code or category..."
            className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>

        <ActionButton
          variant="secondary"
          icon={<RefreshCcw size={18} />}
          onClick={loadPlans}
        >
          Refresh
        </ActionButton>

        <ActionButton icon={<PlusCircle size={18} />} onClick={openCreate}>
          Add Plan
        </ActionButton>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="hidden xl:grid grid-cols-9 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
          <span>Name</span>
          <span>Code</span>
          <span>Service</span>
          <span>Category</span>
          <span>Cost</span>
          <span>Selling</span>
          <span>Profit</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800">
          {plans.length === 0 ? (
            <div className="p-8 text-slate-500">No API plans found.</div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="grid xl:grid-cols-9 gap-4 px-6 py-5 items-center"
              >
                <div>
                  <h3 className="font-bold">{plan.name}</h3>
                  <p className="text-xs text-slate-500">
                    {plan.description || "No description"}
                  </p>
                </div>

                <span className="text-slate-400">{plan.code}</span>
                <span className="text-slate-400">
                  {plan.service?.name || "-"}
                </span>
                <span className="text-slate-400">{plan.category || "-"}</span>
                <span className="text-slate-400">
                  {formatNaira(plan.costPrice)}
                </span>
                <span className="font-bold">
                  {formatNaira(plan.sellingPrice)}
                </span>
                <span className="text-green-400">
                  {formatNaira(profit(plan))}
                </span>

                <span
                  className={`w-fit px-3 py-1 rounded-full text-xs ${
                    plan.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {plan.status}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(plan)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => changeStatus(plan)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    onClick={() => deletePlan(plan)}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-2 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-5">
              {editing ? "Edit API Plan" : "Add API Plan"}
            </h2>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-slate-400">Service</label>
                <select
                  value={form.serviceId}
                  onChange={(e) =>
                    setForm({ ...form, serviceId: e.target.value })
                  }
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="">Select Service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Plan Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="MTN SME 1GB"
              />

              <Input
                label="Plan Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
                placeholder="MTN_SME_1GB"
              />

              <Input
                label="Category"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v.toUpperCase() })}
                placeholder="DATA"
              />

              <Input
                label="Cost Price"
                type="number"
                value={form.costPrice}
                onChange={(v) => setForm({ ...form, costPrice: v })}
                placeholder="500"
              />

              <Input
                label="Selling Price"
                type="number"
                value={form.sellingPrice}
                onChange={(v) => setForm({ ...form, sellingPrice: v })}
                placeholder="600"
              />

              <div>
                <label className="text-sm text-slate-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <Input
                label="Description"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="Plan description"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl"
              >
                Cancel
              </button>

              <button
                onClick={submitPlan}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold"
              >
                {editing ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
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