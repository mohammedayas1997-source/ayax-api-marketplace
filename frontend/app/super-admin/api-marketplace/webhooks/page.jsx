"use client";

import { useEffect, useState } from "react";
import {
  Webhook,
  CheckCircle,
  Globe,
  PlusCircle,
  RefreshCcw,
  Search,
  Edit,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import KpiGrid from "../../components/KpiGrid";
import ActionButton from "../../components/ActionButton";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import api from "@/lib/api";

const emptyForm = {
  name: "",
  url: "",
  events: "",
  secret: "",
  status: "ACTIVE",
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;

      const [listRes, statsRes] = await Promise.all([
        api.get("/webhooks", { params }),
        api.get("/webhooks/statistics"),
      ]);

      setWebhooks(listRes.data.webhooks || []);
      setStats(statsRes.data.stats || {});
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      url: item.url || "",
      events: Array.isArray(item.events)
        ? item.events.join(", ")
        : item.events || "",
      secret: item.secret || "",
      status: item.status || "ACTIVE",
    });
    setFormOpen(true);
  };

  const submitWebhook = async () => {
    try {
      const payload = {
        ...form,
        events: form.events
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      };

      if (editing) {
        await api.patch(`/webhooks/${editing.id}`, payload);
        setMessage("Webhook updated successfully.");
      } else {
        await api.post("/webhooks", payload);
        setMessage("Webhook created successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Operation failed.");
    }
  };

  const removeWebhook = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      await api.delete(`/webhooks/${item.id}`);
      setMessage("Webhook deleted.");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Delete failed.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Webhooks">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Webhook Management"
      description="Manage outgoing webhook endpoints."
    >
      {message && (
        <div className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-blue-300">
          {message}
        </div>
      )}

      <KpiGrid
        items={[
          {
            title: "Total",
            value: stats.total || webhooks.length,
            icon: <Webhook />,
            color: "blue",
          },
          {
            title: "Active",
            value:
              stats.active ||
              webhooks.filter((w) => w.status === "ACTIVE").length,
            icon: <CheckCircle />,
            color: "green",
          },
          {
            title: "Endpoints",
            value: stats.endpoints || webhooks.length,
            icon: <Globe />,
            color: "purple",
          },
        ]}
      />

      <div className="my-6 flex gap-4">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search webhook..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <ActionButton
          variant="secondary"
          icon={<RefreshCcw size={18} />}
          onClick={loadData}
        >
          Refresh
        </ActionButton>

        <ActionButton
          icon={<PlusCircle size={18} />}
          onClick={openCreate}
        >
          Add Webhook
        </ActionButton>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400">
          <span>Name</span>
          <span>Endpoint</span>
          <span>Events</span>
          <span>Status</span>
          <span>Secret</span>
          <span>Actions</span>
        </div>

        {webhooks.length === 0 ? (
          <div className="p-8 text-slate-500">
            No webhooks found.
          </div>
        ) : (
          webhooks.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-6 gap-4 border-b border-slate-800 px-6 py-5"
            >
              <span>{item.name}</span>

              <span className="truncate">
                {item.url}
              </span>

              <span>
                {Array.isArray(item.events)
                  ? item.events.join(", ")
                  : item.events}
              </span>

              <span
                className={
                  item.status === "ACTIVE"
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {item.status}
              </span>

              <span className="truncate">
                {item.secret}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => removeWebhook(item)}
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
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">
              {editing ? "Edit Webhook" : "Create Webhook"}
            </h2>

            <div className="grid gap-4">
              <Input
                label="Webhook Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />

              <Input
                label="Endpoint URL"
                value={form.url}
                onChange={(v) => setForm({ ...form, url: v })}
              />

              <Input
                label="Events (comma separated)"
                value={form.events}
                onChange={(v) => setForm({ ...form, events: v })}
              />

              <Input
                label="Secret"
                value={form.secret}
                onChange={(v) => setForm({ ...form, secret: v })}
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
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
                onClick={submitWebhook}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}