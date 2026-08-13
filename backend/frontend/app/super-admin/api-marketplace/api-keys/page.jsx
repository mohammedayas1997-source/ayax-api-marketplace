"use client";

import { useEffect, useMemo, useState } from "react";
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

const KEY_ENVIRONMENTS = [
  {
    value: "PRODUCTION",
    label: "Production",
    prefix: "Production",
  },
  {
    value: "DEVELOPMENT",
    label: "Development",
    prefix: "Development",
  },
  {
    value: "TEST",
    label: "Test",
    prefix: "Test",
  },
  {
    value: "MOBILE_APP",
    label: "Mobile App",
    prefix: "Mobile App",
  },
  {
    value: "WEBSITE",
    label: "Website",
    prefix: "Website",
  },
  {
    value: "CUSTOM",
    label: "Custom Name",
    prefix: "",
  },
];

const createEmptyForm = () => ({
  userId: "",
  environment: "PRODUCTION",
  customName: "",
  planId: "",
  status: "ACTIVE",
});

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [visibleKeys, setVisibleKeys] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());

  const selectedUser = useMemo(
    () => users.find((user) => user.id === form.userId),
    [users, form.userId]
  );

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.planId),
    [plans, form.planId]
  );

  const selectedEnvironment =
    KEY_ENVIRONMENTS.find(
      (item) => item.value === form.environment
    ) || KEY_ENVIRONMENTS[0];

  const generatedKeyName =
    form.environment === "CUSTOM"
      ? form.customName.trim()
      : `${selectedEnvironment.prefix} API Key${
          selectedPlan?.name
            ? ` - ${selectedPlan.name}`
            : ""
        }`;

  const loadKeys = async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (status !== "ALL") {
        params.status = status;
      }

      const [keysRes, statsRes, usersRes, plansRes] =
        await Promise.all([
          api.get("/api-keys", { params }),
          api.get("/api-keys/statistics"),
          api.get("/users"),
          api.get("/plans"),
        ]);

      setKeys(
        Array.isArray(keysRes.data?.keys)
          ? keysRes.data.keys
          : Array.isArray(keysRes.data?.data)
            ? keysRes.data.data
            : []
      );

      setStats(statsRes.data?.stats || {});

      setUsers(
        Array.isArray(usersRes.data?.users)
          ? usersRes.data.users
          : Array.isArray(usersRes.data?.data)
            ? usersRes.data.data
            : []
      );

      setPlans(
        Array.isArray(plansRes.data?.plans)
          ? plansRes.data.plans
          : Array.isArray(plansRes.data?.data)
            ? plansRes.data.data
            : []
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to load API keys."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [status]);

  const filteredKeys = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return keys;
    }

    return keys.filter((key) =>
      [
        key.name,
        key.key,
        key.user?.name,
        key.user?.email,
        key.plan?.name,
        key.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [keys, search]);

  const openCreate = () => {
    setForm(createEmptyForm());
    setMessage("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;

    setFormOpen(false);
    setForm(createEmptyForm());
  };

  const submitKey = async () => {
    if (!form.userId) {
      setMessage("Please select a user.");
      return;
    }

    if (!generatedKeyName) {
      setMessage("Please enter a key name.");
      return;
    }

    const payload = {
      userId: form.userId,
      name: generatedKeyName,
      planId: form.planId || null,
      status: form.status,
    };

    try {
      setSaving(true);
      setMessage("");

      await api.post("/api-keys", payload);

      setMessage("API key created successfully.");
      closeForm();
      await loadKeys();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to create API key."
      );
    } finally {
      setSaving(false);
    }
  };

  const regenerateKey = async (key) => {
    const enteredPin = prompt("Enter Super Admin PIN");

    if (!enteredPin) return;

    try {
      setMessage("");

      await api.patch(
        `/api-keys/${key.id}/regenerate`,
        {
          pin: enteredPin,
        }
      );

      setMessage("API key regenerated successfully.");
      await loadKeys();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to regenerate key."
      );
    }
  };

  const changeStatus = async (key) => {
    try {
      setMessage("");

      const nextStatus =
        key.status === "ACTIVE"
          ? "DISABLED"
          : "ACTIVE";

      await api.patch(
        `/api-keys/${key.id}/status`,
        {
          status: nextStatus,
        }
      );

      setMessage(
        `API key status changed to ${nextStatus}.`
      );

      await loadKeys();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to update status."
      );
    }
  };

  const deleteKey = async (key) => {
    if (!confirm(`Delete API key ${key.name}?`)) {
      return;
    }

    try {
      setMessage("");

      await api.delete(`/api-keys/${key.id}`);

      setMessage("API key deleted successfully.");
      await loadKeys();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to delete API key."
      );
    }
  };

  const copyKey = async (value) => {
    if (!value) {
      setMessage("No API key is available to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMessage("API key copied.");
    } catch {
      setMessage("Failed to copy API key.");
    }
  };

  const maskKey = (value) => {
    if (!value) return "-";

    if (value.length <= 18) {
      return `${value.slice(0, 6)}••••${value.slice(-4)}`;
    }

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
      description="Select a user, key type and plan; the key name will be generated automatically."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-8">
        <KpiGrid
          items={[
            {
              title: "Total API Keys",
              value: stats.total ?? keys.length,
              icon: <KeyRound />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ??
                keys.filter(
                  (key) => key.status === "ACTIVE"
                ).length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ??
                keys.filter(
                  (key) => key.status !== "ACTIVE"
                ).length,
              icon: <XCircle />,
              color: "red",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px_auto_auto]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadKeys();
              }
            }}
            placeholder="Search API keys..."
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 outline-none"
        >
          <option value="ALL">
            All Status
          </option>
          <option value="ACTIVE">
            Active
          </option>
          <option value="DISABLED">
            Disabled
          </option>
        </select>

        <ActionButton
          variant="secondary"
          icon={<RefreshCcw size={18} />}
          onClick={loadKeys}
        >
          Refresh
        </ActionButton>

        <ActionButton
          icon={<PlusCircle size={18} />}
          onClick={openCreate}
        >
          Create Key
        </ActionButton>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="hidden grid-cols-8 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 xl:grid">
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
          {filteredKeys.length === 0 ? (
            <div className="p-8 text-slate-500">
              No API keys found.
            </div>
          ) : (
            filteredKeys.map((key) => (
              <div
                key={key.id}
                className="grid items-center gap-4 px-6 py-5 xl:grid-cols-8"
              >
                <div>
                  <h3 className="font-bold">
                    {key.name}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {key.id}
                  </p>
                </div>

                <div>
                  <p className="text-slate-300">
                    {key.user?.name || "-"}
                  </p>

                  <p className="text-xs text-slate-500">
                    {key.user?.email || "-"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="break-all text-xs text-slate-400">
                    {visibleKeys[key.id]
                      ? key.key
                      : maskKey(key.key)}
                  </span>

                  <button
                    type="button"
                    title={
                      visibleKeys[key.id]
                        ? "Hide API key"
                        : "Show API key"
                    }
                    onClick={() =>
                      setVisibleKeys((current) => ({
                        ...current,
                        [key.id]:
                          !current[key.id],
                      }))
                    }
                    className="text-slate-400 hover:text-white"
                  >
                    {visibleKeys[key.id] ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Copy API key"
                    onClick={() => copyKey(key.key)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy size={15} />
                  </button>
                </div>

                <span className="text-slate-400">
                  {key.plan?.name || "-"}
                </span>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs ${
                    key.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {key.status}
                </span>

                <span className="text-slate-400">
                  {key.lastUsedAt
                    ? new Date(
                        key.lastUsedAt
                      ).toLocaleString()
                    : "Never"}
                </span>

                <span className="text-slate-400">
                  {key.createdAt
                    ? new Date(
                        key.createdAt
                      ).toLocaleDateString()
                    : "-"}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Regenerate API key"
                    onClick={() =>
                      regenerateKey(key)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    type="button"
                    title={
                      key.status === "ACTIVE"
                        ? "Disable API key"
                        : "Activate API key"
                    }
                    onClick={() =>
                      changeStatus(key)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    type="button"
                    title="Delete API key"
                    onClick={() =>
                      deleteKey(key)
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
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-xl font-bold">
              Create API Key
            </h2>

            <p className="mb-6 text-sm text-slate-400">
              Select the user, key type and plan.
              The key name will be generated automatically.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="User"
                value={form.userId}
                onChange={(value) =>
                  setForm({
                    ...form,
                    userId: value,
                  })
                }
              >
                <option value="">
                  Select User
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name} — {user.email}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Key Type"
                value={form.environment}
                onChange={(value) =>
                  setForm({
                    ...form,
                    environment: value,
                    customName:
                      value === "CUSTOM"
                        ? form.customName
                        : "",
                  })
                }
              >
                {KEY_ENVIRONMENTS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </SelectField>

              {form.environment === "CUSTOM" && (
                <div className="md:col-span-2">
                  <Input
                    label="Custom Key Name"
                    value={form.customName}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        customName: value,
                      })
                    }
                    placeholder="My Custom API Key"
                  />
                </div>
              )}

              <SelectField
                label="Plan"
                value={form.planId}
                onChange={(value) =>
                  setForm({
                    ...form,
                    planId: value,
                  })
                }
              >
                <option value="">
                  No specific plan
                </option>

                {plans.map((plan) => (
                  <option
                    key={plan.id}
                    value={plan.id}
                  >
                    {plan.name}
                  </option>
                ))}
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

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  API key preview
                </p>

                <p className="mt-2 font-semibold">
                  {generatedKeyName ||
                    "API key name"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  User:{" "}
                  {selectedUser
                    ? `${selectedUser.name} — ${selectedUser.email}`
                    : "Not selected"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Plan:{" "}
                  {selectedPlan?.name ||
                    "No specific plan"}
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
                onClick={submitKey}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Creating..."
                  : "Create Key"}
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
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
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
  type = "text",
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}