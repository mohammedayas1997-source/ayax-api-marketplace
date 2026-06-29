"use client";

import { useEffect, useState } from "react";
import {
  Server,
  CheckCircle,
  XCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Edit,
  Trash2,
  Power,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const emptyForm = {
  name: "",
  code: "",
  baseUrl: "",
  status: "ACTIVE",
  description: "",
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const loadProviders = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;
      if (status !== "ALL") params.status = status;

      const [providersRes, statsRes] = await Promise.all([
        api.get("/api-providers", { params }),
        api.get("/api-providers/statistics"),
      ]);

      setProviders(providersRes.data.providers || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load providers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [status]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (provider) => {
    setEditing(provider);
    setForm({
      name: provider.name || "",
      code: provider.code || "",
      baseUrl: provider.baseUrl || "",
      status: provider.status || "ACTIVE",
      description: provider.description || "",
    });
    setFormOpen(true);
  };

  const submitProvider = async () => {
    try {
      if (editing) {
        await api.patch(`/api-providers/${editing.id}`, form);
        setMessage("Provider updated successfully.");
      } else {
        await api.post("/api-providers", form);
        setMessage("Provider created successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadProviders();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save provider.");
    }
  };

  const changeStatus = async (provider) => {
    try {
      const nextStatus =
        provider.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

      await api.patch(`/api-providers/${provider.id}/status`, {
        status: nextStatus,
      });

      setMessage(`Provider status changed to ${nextStatus}.`);
      loadProviders();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update status.");
    }
  };

  const deleteProvider = async (provider) => {
    if (!confirm(`Delete ${provider.name}?`)) return;

    try {
      await api.delete(`/api-providers/${provider.id}`);
      setMessage("Provider deleted successfully.");
      loadProviders();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete provider.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="API Providers">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Providers"
      description="Manage third-party API providers such as VTpass, Reloadly, Termii, Monnify and custom gateways."
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
              title: "Total Providers",
              value: stats.total || providers.length,
              icon: <Server />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ||
                providers.filter((p) => p.status === "ACTIVE").length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ||
                providers.filter((p) => p.status !== "ACTIVE").length,
              icon: <XCircle />,
              color: "red",
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
            placeholder="Search providers by name, code or base URL..."
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
          onClick={loadProviders}
        >
          Refresh
        </ActionButton>

        <ActionButton icon={<PlusCircle size={18} />} onClick={openCreate}>
          Add Provider
        </ActionButton>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="hidden xl:grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
          <span>Name</span>
          <span>Code</span>
          <span>Base URL</span>
          <span>Status</span>
          <span>Services</span>
          <span>Created</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800">
          {providers.length === 0 ? (
            <div className="p-8 text-slate-500">No providers found.</div>
          ) : (
            providers.map((provider) => (
              <div
                key={provider.id}
                className="grid xl:grid-cols-7 gap-4 px-6 py-5 items-center"
              >
                <div>
                  <h3 className="font-bold">{provider.name}</h3>
                  <p className="text-xs text-slate-500">
                    {provider.description || "No description"}
                  </p>
                </div>

                <span className="text-slate-400">{provider.code}</span>

                <span className="text-slate-400 break-all">
                  {provider.baseUrl || "-"}
                </span>

                <span
                  className={`w-fit px-3 py-1 rounded-full text-xs ${
                    provider.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {provider.status}
                </span>

                <span className="text-slate-400">
                  {provider.services?.length || 0}
                </span>

                <span className="text-slate-400">
                  {provider.createdAt
                    ? new Date(provider.createdAt).toLocaleDateString()
                    : "-"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(provider)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => changeStatus(provider)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    onClick={() => deleteProvider(provider)}
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
              {editing ? "Edit Provider" : "Add Provider"}
            </h2>

            <div className="grid gap-4">
              <Input
                label="Provider Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="VTpass"
              />

              <Input
                label="Provider Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
                placeholder="VTPASS"
              />

              <Input
                label="Base URL"
                value={form.baseUrl}
                onChange={(v) => setForm({ ...form, baseUrl: v })}
                placeholder="https://api.provider.com"
              />

              <div>
                <label className="text-sm text-slate-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
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
                placeholder="Provider description"
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
                onClick={submitProvider}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold"
              >
                {editing ? "Update Provider" : "Create Provider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      />
    </div>
  );
}