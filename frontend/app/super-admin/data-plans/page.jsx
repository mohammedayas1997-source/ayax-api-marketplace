"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  Search,
  Wifi,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";

const emptyForm = {
  name: "",
  code: "",
  category: "DATA",
  costPrice: "",
  sellingPrice: "",
  status: "ACTIVE",
};

export default function DataPlansAdminPage() {
  const [plans, setPlans] = useState([]);
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api-plans");
      setPlans(res.data.plans || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const q = query.toLowerCase();
      const planNetwork = plan.service?.category || plan.category || "";
      const matchesSearch =
        plan.name?.toLowerCase().includes(q) ||
        plan.code?.toLowerCase().includes(q) ||
        String(plan.sellingPrice || "").includes(q);

      const matchesNetwork =
        network === "ALL" || plan.name?.toLowerCase().includes(network.toLowerCase());

      return matchesSearch && matchesNetwork;
    });
  }, [plans, query, network]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      name: plan.name || "",
      code: plan.code || "",
      category: plan.category || "DATA",
      costPrice: plan.costPrice || "",
      sellingPrice: plan.sellingPrice || "",
      status: plan.status || "ACTIVE",
    });
    setFormOpen(true);
  };

  const savePlan = async () => {
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
      };

      if (editing) {
        await api.patch(`/api-plans/${editing.id}`, payload);
        setMessage("Plan updated successfully.");
      } else {
        await api.post("/api-plans", payload);
        setMessage("Plan created successfully.");
      }

      setFormOpen(false);
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save plan.");
    }
  };

  const deletePlan = async (plan) => {
    if (!confirm(`Delete ${plan.name}?`)) return;

    try {
      await api.delete(`/api-plans/${plan.id}`);
      setMessage("Plan deleted successfully.");
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Delete failed.");
    }
  };

  const toggleStatus = async (plan) => {
    try {
      await api.patch(`/api-plans/${plan.id}/status`, {
        status: plan.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      });
      loadPlans();
    } catch (error) {
      setMessage(error.response?.data?.message || "Status update failed.");
    }
  };

  return (
    <SuperAdminLayout
      title="Data Plans Management"
      description="Manage data plans from 500MB to 100GB, prices and status."
    >
      {message && (
        <div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-6 grid lg:grid-cols-[1fr_200px_180px] gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plan, code or price..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4"
        >
          <option value="ALL">All Networks</option>
          <option value="MTN">MTN</option>
          <option value="Airtel">Airtel</option>
          <option value="Glo">Glo</option>
          <option value="9mobile">9mobile</option>
        </select>

        <button
          onClick={openCreate}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
        >
          <PlusCircle size={18} />
          Add Plan
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="hidden xl:grid grid-cols-7 gap-4 border-b border-slate-800 px-6 py-4 text-sm text-slate-400 font-semibold">
          <span>Plan</span>
          <span>Code</span>
          <span>Category</span>
          <span>Cost Price</span>
          <span>Selling Price</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-8 text-slate-400">Loading plans...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-8 text-slate-500">No plans found.</div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="grid xl:grid-cols-7 gap-4 items-center px-6 py-5 border-b border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                  <Wifi size={18} />
                </div>
                <span className="font-bold">{plan.name}</span>
              </div>

              <span className="text-slate-400">{plan.code}</span>
              <span className="text-slate-400">{plan.category}</span>
              <span>₦{Number(plan.costPrice || 0).toLocaleString()}</span>
              <span className="font-bold text-blue-400">
                ₦{Number(plan.sellingPrice || 0).toLocaleString()}
              </span>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs ${
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
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => toggleStatus(plan)}
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                >
                  {plan.status === "ACTIVE" ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                </button>

                <button
                  onClick={() => deletePlan(plan)}
                  className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold mb-5">
              {editing ? "Edit Data Plan" : "Add Data Plan"}
            </h2>

            <div className="space-y-4">
              <Input label="Plan Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
              <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
              <Input label="Cost Price" type="number" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
              <Input label="Selling Price" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />

              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-2xl bg-slate-800 px-5 py-3"
              >
                Cancel
              </button>
              <button
                onClick={savePlan}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}