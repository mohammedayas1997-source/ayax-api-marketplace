"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Webhook,
  CheckCircle,
  Globe,
  PlusCircle,
  RefreshCcw,
  Search,
  Edit,
  Trash2,
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

const WEBHOOK_TEMPLATES = [
  {
    value: "TRANSACTIONS",
    label: "Transaction Updates",
    name: "Transaction Webhook",
    events: [
      "transaction.success",
      "transaction.failed",
      "transaction.pending",
      "transaction.reversed",
    ],
  },
  {
    value: "WALLET",
    label: "Wallet Updates",
    name: "Wallet Webhook",
    events: [
      "wallet.funded",
      "wallet.debited",
      "wallet.refunded",
      "wallet.adjusted",
    ],
  },
  {
    value: "DATA",
    label: "Data Services",
    name: "Data Service Webhook",
    events: [
      "data.success",
      "data.failed",
      "data.pending",
    ],
  },
  {
    value: "AIRTIME",
    label: "Airtime Services",
    name: "Airtime Service Webhook",
    events: [
      "airtime.success",
      "airtime.failed",
      "airtime.pending",
    ],
  },
  {
    value: "PAYMENTS",
    label: "Payment Events",
    name: "Payment Webhook",
    events: [
      "payment.success",
      "payment.failed",
      "payment.pending",
    ],
  },
  {
    value: "API_KEYS",
    label: "API Key Events",
    name: "API Key Webhook",
    events: [
      "api_key.created",
      "api_key.regenerated",
      "api_key.disabled",
      "api_key.deleted",
    ],
  },
  {
    value: "ALL",
    label: "All Important Events",
    name: "Main Webhook",
    events: [
      "transaction.success",
      "transaction.failed",
      "wallet.funded",
      "wallet.debited",
      "data.success",
      "data.failed",
      "airtime.success",
      "airtime.failed",
      "payment.success",
      "payment.failed",
    ],
  },
  {
    value: "CUSTOM",
    label: "Custom Webhook",
    name: "",
    events: [],
  },
];

const ALL_EVENT_OPTIONS = Array.from(
  new Set(
    WEBHOOK_TEMPLATES.flatMap(
      (template) => template.events
    )
  )
);

const generateSecret = () => {
  if (
    typeof window !== "undefined" &&
    window.crypto?.getRandomValues
  ) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);

    return `whsec_${Array.from(bytes)
      .map((byte) =>
        byte.toString(16).padStart(2, "0")
      )
      .join("")}`;
  }

  return `whsec_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 18)}`;
};

const createEmptyForm = () => {
  const template = WEBHOOK_TEMPLATES[0];

  return {
    templateType: template.value,
    name: template.name,
    url: "",
    events: template.events,
    secret: "",
    status: "ACTIVE",
  };
};

const getTemplateType = (item) => {
  const itemEvents = Array.isArray(item?.events)
    ? [...item.events].sort()
    : [];

  const matched = WEBHOOK_TEMPLATES.find(
    (template) =>
      template.value !== "CUSTOM" &&
      template.name === item?.name &&
      JSON.stringify([...template.events].sort()) ===
        JSON.stringify(itemEvents)
  );

  return matched?.value || "CUSTOM";
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [visibleSecrets, setVisibleSecrets] =
    useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(
    createEmptyForm()
  );

  const customWebhook =
    form.templateType === "CUSTOM";

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      const [listRes, statsRes] =
        await Promise.all([
          api.get("/webhooks", { params }),
          api.get("/webhooks/statistics"),
        ]);

      setWebhooks(
        Array.isArray(listRes.data?.webhooks)
          ? listRes.data.webhooks
          : Array.isArray(listRes.data?.data)
            ? listRes.data.data
            : []
      );

      setStats(statsRes.data?.stats || {});
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to load webhooks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredWebhooks = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return webhooks;
    }

    return webhooks.filter((item) =>
      [
        item.name,
        item.url,
        item.status,
        ...(Array.isArray(item.events)
          ? item.events
          : [item.events]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [webhooks, search]);

  const chooseTemplate = (templateType) => {
    const template =
      WEBHOOK_TEMPLATES.find(
        (item) => item.value === templateType
      ) || WEBHOOK_TEMPLATES[0];

    setForm((current) => ({
      ...current,
      templateType: template.value,
      name:
        template.value === "CUSTOM"
          ? ""
          : template.name,
      events: [...template.events],
    }));
  };

  const toggleEvent = (eventName) => {
    setForm((current) => {
      const exists =
        current.events.includes(eventName);

      return {
        ...current,
        events: exists
          ? current.events.filter(
              (item) => item !== eventName
            )
          : [...current.events, eventName],
      };
    });
  };

  const openCreate = () => {
    const initial = createEmptyForm();

    setEditing(null);
    setForm({
      ...initial,
      secret: generateSecret(),
    });
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      templateType: getTemplateType(item),
      name: item.name || "",
      url: item.url || "",
      events: Array.isArray(item.events)
        ? item.events
        : String(item.events || "")
            .split(",")
            .map((event) => event.trim())
            .filter(Boolean),
      secret:
        item.secret || generateSecret(),
      status: item.status || "ACTIVE",
    });

    setMessage("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;

    setFormOpen(false);
    setEditing(null);
    setForm(createEmptyForm());
  };

  const submitWebhook = async () => {
    const name = form.name.trim();
    const url = form.url.trim();
    const secret = form.secret.trim();

    if (!name) {
      setMessage("Webhook name is required.");
      return;
    }

    if (!url) {
      setMessage("Endpoint URL is required.");
      return;
    }

    try {
      const parsedUrl = new URL(url);

      if (
        !["http:", "https:"].includes(
          parsedUrl.protocol
        )
      ) {
        throw new Error();
      }
    } catch {
      setMessage(
        "Enter a valid URL beginning with http:// or https://."
      );
      return;
    }

    if (form.events.length === 0) {
      setMessage(
        "Select at least one webhook event."
      );
      return;
    }

    if (!secret) {
      setMessage("Webhook secret is required.");
      return;
    }

    const payload = {
      name,
      url: url.replace(/\/+$/, ""),
      events: form.events,
      secret,
      status: form.status,
    };

    try {
      setSaving(true);
      setMessage("");

      if (editing) {
        await api.patch(
          `/webhooks/${editing.id}`,
          payload
        );

        setMessage(
          "Webhook updated successfully."
        );
      } else {
        await api.post("/webhooks", payload);

        setMessage(
          "Webhook created successfully."
        );
      }

      closeForm();
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Operation failed."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeWebhook = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) {
      return;
    }

    try {
      setMessage("");

      await api.delete(
        `/webhooks/${item.id}`
      );

      setMessage("Webhook deleted.");
      await loadData();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Delete failed."
      );
    }
  };

  const copySecret = async (value) => {
    if (!value) {
      setMessage(
        "No webhook secret is available."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        value
      );

      setMessage(
        "Webhook secret copied."
      );
    } catch {
      setMessage(
        "Failed to copy webhook secret."
      );
    }
  };

  const maskSecret = (value) => {
    if (!value) return "-";

    if (value.length <= 16) {
      return `${value.slice(0, 5)}••••${value.slice(-3)}`;
    }

    return `${value.slice(0, 10)}••••••••${value.slice(-6)}`;
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
      description="Select the webhook type and events; only enter the destination URL manually."
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
            value:
              stats.total ??
              webhooks.length,
            icon: <Webhook />,
            color: "blue",
          },
          {
            title: "Active",
            value:
              stats.active ??
              webhooks.filter(
                (item) =>
                  item.status === "ACTIVE"
              ).length,
            icon: <CheckCircle />,
            color: "green",
          },
          {
            title: "Endpoints",
            value:
              stats.endpoints ??
              webhooks.length,
            icon: <Globe />,
            color: "purple",
          },
        ]}
      />

      <div className="my-6 grid gap-4 lg:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadData();
              }
            }}
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

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="hidden grid-cols-6 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 xl:grid">
          <span>Name</span>
          <span>Endpoint</span>
          <span>Events</span>
          <span>Status</span>
          <span>Secret</span>
          <span>Actions</span>
        </div>

        {filteredWebhooks.length === 0 ? (
          <div className="p-8 text-slate-500">
            No webhooks found.
          </div>
        ) : (
          filteredWebhooks.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-4 border-b border-slate-800 px-6 py-5 xl:grid-cols-6"
            >
              <span className="font-semibold">
                {item.name}
              </span>

              <span className="truncate text-slate-400">
                {item.url}
              </span>

              <div className="flex flex-wrap gap-1">
                {(Array.isArray(item.events)
                  ? item.events
                  : [item.events]
                )
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((eventName) => (
                    <span
                      key={eventName}
                      className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300"
                    >
                      {eventName}
                    </span>
                  ))}

                {Array.isArray(item.events) &&
                  item.events.length > 3 && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                      +{item.events.length - 3}
                    </span>
                  )}
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs ${
                  item.status === "ACTIVE"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {item.status}
              </span>

              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-slate-400">
                  {visibleSecrets[item.id]
                    ? item.secret
                    : maskSecret(item.secret)}
                </span>

                <button
                  type="button"
                  title={
                    visibleSecrets[item.id]
                      ? "Hide secret"
                      : "Show secret"
                  }
                  onClick={() =>
                    setVisibleSecrets(
                      (current) => ({
                        ...current,
                        [item.id]:
                          !current[item.id],
                      })
                    )
                  }
                  className="text-slate-400 hover:text-white"
                >
                  {visibleSecrets[item.id] ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>

                <button
                  type="button"
                  title="Copy secret"
                  onClick={() =>
                    copySecret(item.secret)
                  }
                  className="text-slate-400 hover:text-white"
                >
                  <Copy size={15} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  title="Edit webhook"
                  onClick={() => openEdit(item)}
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                >
                  <Edit size={16} />
                </button>

                <button
                  type="button"
                  title="Delete webhook"
                  onClick={() =>
                    removeWebhook(item)
                  }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-xl font-bold">
              {editing
                ? "Edit Webhook"
                : "Create Webhook"}
            </h2>

            <p className="mb-6 text-sm text-slate-400">
              Select a webhook type. The name,
              events and secret will be prepared
              automatically.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Webhook Type"
                value={form.templateType}
                onChange={chooseTemplate}
              >
                {WEBHOOK_TEMPLATES.map(
                  (template) => (
                    <option
                      key={template.value}
                      value={template.value}
                    >
                      {template.label}
                    </option>
                  )
                )}
              </SelectField>

              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) =>
                  setForm({
                    ...form,
                    status: value,
                  })
                }
              >
                <option value="ACTIVE">
                  ACTIVE
                </option>
                <option value="DISABLED">
                  DISABLED
                </option>
              </SelectField>

              <Input
                label="Webhook Name"
                value={form.name}
                onChange={(value) =>
                  setForm({
                    ...form,
                    name: value,
                  })
                }
                readOnly={!customWebhook}
                placeholder="Webhook name"
              />

              <Input
                label="Endpoint URL"
                value={form.url}
                onChange={(value) =>
                  setForm({
                    ...form,
                    url: value,
                  })
                }
                placeholder="https://your-app.com/api/webhooks/ayax"
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">
                  Events
                </label>

                <div className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2">
                  {ALL_EVENT_OPTIONS.map(
                    (eventName) => (
                      <label
                        key={eventName}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.events.includes(
                            eventName
                          )}
                          onChange={() =>
                            toggleEvent(eventName)
                          }
                          className="h-4 w-4"
                        />

                        <span>
                          {eventName}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-400">
                  Webhook Secret
                </label>

                <div className="flex gap-2">
                  <input
                    value={form.secret}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        secret:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    title="Generate new secret"
                    onClick={() =>
                      setForm({
                        ...form,
                        secret:
                          generateSecret(),
                      })
                    }
                    className="rounded-2xl bg-slate-800 px-4 hover:bg-slate-700"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button
                    type="button"
                    title="Copy secret"
                    onClick={() =>
                      copySecret(form.secret)
                    }
                    className="rounded-2xl bg-slate-800 px-4 hover:bg-slate-700"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Webhook preview
                </p>

                <p className="mt-2 font-semibold">
                  {form.name || "Webhook name"}
                </p>

                <p className="mt-1 break-all text-sm text-slate-400">
                  {form.url ||
                    "Endpoint URL not entered"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {form.events.length} event
                  {form.events.length === 1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className="rounded-2xl bg-slate-800 px-5 py-3 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={submitWebhook}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Webhook"
                    : "Create Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
      >
        {children}
      </select>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={`w-full rounded-2xl border border-slate-800 px-4 py-3 outline-none ${
          readOnly
            ? "cursor-not-allowed bg-slate-900 text-slate-500"
            : "bg-slate-950 focus:border-blue-500"
        }`}
      />
    </div>
  );
}