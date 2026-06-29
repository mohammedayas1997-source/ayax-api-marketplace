"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  CheckCircle,
  XCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Trash2,
  Power,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const emptyForm = {
  userId: "",
  name: "",
  planId: "",
  status: "ACTIVE",
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [visibleKeys, setVisibleKeys] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pin, setPin] = useState("");

  const loadKeys = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;
      if (status !== "ALL") params.status = status;

      const [keysRes, statsRes, usersRes, plansRes] = await Promise.all([
        api.get("/api-keys", { params }),
        api.get("/api-keys/statistics"),
        api.get("/users"),
        api.get("/api-plans"),
      ]);

      setKeys(keysRes.data.keys || []);
      setStats(statsRes.data.stats || {});
      setUsers(usersRes.data.users || []);
      setPlans(plansRes.data.plans || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [status]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const submitKey = async () => {
    try {
      await api.post("/api-keys", form);
      setMessage("API key created successfully.");
      setFormOpen(false);
      setForm(emptyForm);
      loadKeys();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create API key.");
    }
  };

  const regenerateKey = async (key) => {
    const enteredPin = prompt("Enter Super Admin PIN");

    if (!enteredPin) return;

    try {
      await api.patch(`/api-keys/${key.id}/regenerate`, {
        pin: enteredPin,
      });

      setMessage("API key regenerated successfully.");
      loadKeys();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to regenerate key.");
    }
  };

  const changeStatus = async (key) => {
    try {
      const nextStatus = key.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

      await api.patch(`/api-keys/${key.id}/status`, {
        status: nextStatus,
      });

      setMessage(`API key status changed to ${nextStatus}.`);
      loadKeys();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update status.");
    }
  };

  const deleteKey = async (key) => {
    if (!confirm(`Delete API key ${key.name}?`)) return;

    try {
      await api.delete(`/api-keys/${key.id}`);
      setMessage("API key deleted successfully.");
      loadKeys();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete API key.");
    }
  };

  const copyKey = async (value) => {
    try {
      await navigator.clipboard.writeText(value || "");
      setMessage("API key copied.");
    } catch {
      setMessage("Failed to copy API key.");
    }
  };

  const maskKey = (value) => {
    if (!value) return "-";
    return `${value.slice(0, 12)}••••••••••${value.slice(-6)}`;
  };

  if (loading) {
    return (
      <DashboardLayout title="API Keys">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Keys"
      description="Create, manage, regenerate and disable developer API keys."
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
              title: "Total API Keys",
              value: stats.total || keys.length,
              icon: <KeyRound />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ||
                keys.filter((k) => k.status === "ACTIVE").length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ||
                keys.filter((k) => k.status !== "ACTIVE").length,
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
            placeholder="Search API keys by name, user, email or key..."
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
          onClick={loadKeys}
        >
          Refresh
        </ActionButton>

        <ActionButton icon={<PlusCircle size={18} />} onClick={openCreate}>
          Create Key
        </ActionButton>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
          <span>Name</span>
          <span>User</span>
          <span>API Key</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Last Used</span>
          <span>Created</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800">
          {keys.length === 0 ? (
            <div className="p-8 text-slate-500">No API keys found.</div>
          ) : (
            keys.map((key) => (
              <div
                key={key.id}
                className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
              >
                <div>
                  <h3 className="font-bold">{key.name}</h3>
                  <p className="text-xs text-slate-500">{key.id}</p>
                </div>

                <div>
                  <p className="text-slate-300">{key.user?.name || "-"}</p>
                  <p className="text-xs text-slate-500">
                    {key.user?.email || "-"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs break-all">
                    {visibleKeys[key.id] ? key.key : maskKey(key.key)}
                  </span>

                  <button
                    onClick={() =>
                      setVisibleKeys({
                        ...visibleKeys,
                        [key.id]: !visibleKeys[key.id],
                      })
                    }
                    className="text-slate-400"
                  >
                    {visibleKeys[key.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>

                  <button onClick={() => copyKey(key.key)} className="text-slate-400">
                    <Copy size={15} />
                  </button>
                </div>

                <span className="text-slate-400">
                  {key.plan?.name || "-"}
                </span>

                <span
                  className={`w-fit px-3 py-1 rounded-full text-xs ${
                    key.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {key.status}
                </span>

                <span className="text-slate-400">
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleString()
                    : "Never"}
                </span>

                <span className="text-slate-400">
                  {key.createdAt
                    ? new Date(key.createdAt).toLocaleDateString()
                    : "-"}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => regenerateKey(key)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    onClick={() => changeStatus(key)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    onClick={() => deleteKey(key)}
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
            <h2 className="text-xl font-bold mb-5">Create API Key</h2>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-slate-400">User</label>
                <select
                  value={form.userId}
                  onChange={(e) =>
                    setForm({ ...form, userId: e.target.value })
                  }
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Key Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Production API Key"
              />

              <div>
                <label className="text-sm text-slate-400">Plan</label>
                <select
                  value={form.planId}
                  onChange={(e) =>
                    setForm({ ...form, planId: e.target.value })
                  }
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="">No specific plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl"
              >
                Cancel
              </button>

              <button
                onClick={submitKey}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold"
              >
                Create Key
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