"use client";

import { useEffect, useMemo, useState } from "react";
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

/*
 * Zaɓin provider zai cika name, code,
 * default base URL da description da kansa.
 *
 * Idan provider ɗin da kake so baya nan,
 * zaɓi "Custom Provider".
 */
const PROVIDER_OPTIONS = [
  {
    value: "VTPASS",
    name: "VTpass",
    code: "VTPASS",
    baseUrl: "https://sandbox.vtpass.com/api",
    description:
      "VTU provider for data, airtime, electricity, cable TV and other digital services.",
  },
  {
    value: "CLUBKONNECT",
    name: "ClubKonnect",
    code: "CLUBKONNECT",
    baseUrl: "https://www.nellobytesystems.com",
    description:
      "VTU provider for airtime, data bundles, cable TV and electricity services.",
  },
  {
    value: "RELOADLY",
    name: "Reloadly",
    code: "RELOADLY",
    baseUrl: "https://topups.reloadly.com",
    description:
      "International airtime and data top-up API provider.",
  },
  {
    value: "TERMII",
    name: "Termii",
    code: "TERMII",
    baseUrl: "https://api.ng.termii.com/api",
    description:
      "Messaging, OTP, phone verification and notification API provider.",
  },
  {
    value: "MONNIFY",
    name: "Monnify",
    code: "MONNIFY",
    baseUrl: "https://sandbox.monnify.com/api",
    description:
      "Payment collections, reserved accounts and transaction verification provider.",
  },
  {
    value: "PAYSTACK",
    name: "Paystack",
    code: "PAYSTACK",
    baseUrl: "https://api.paystack.co",
    description:
      "Online payment collection and transaction verification provider.",
  },
  {
    value: "FLUTTERWAVE",
    name: "Flutterwave",
    code: "FLUTTERWAVE",
    baseUrl: "https://api.flutterwave.com/v3",
    description:
      "Payment processing, collections and payout API provider.",
  },
  {
    value: "CUSTOM",
    name: "Custom Provider",
    code: "CUSTOM",
    baseUrl: "",
    description:
      "Custom third-party API provider or private gateway.",
  },
];

const createEmptyForm = () => {
  const provider = PROVIDER_OPTIONS[0];

  return {
    providerType: provider.value,
    name: provider.name,
    code: provider.code,
    baseUrl: provider.baseUrl,
    status: "ACTIVE",
    description: provider.description,
  };
};

const normalizeProviderCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getProviderType = (provider) => {
  const code = normalizeProviderCode(provider?.code);

  return (
    PROVIDER_OPTIONS.find(
      (item) => item.code === code
    )?.value || "CUSTOM"
  );
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [editing, setEditing] = useState(null);

  const customProvider =
    form.providerType === "CUSTOM";

  const loadProviders = async () => {
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

      const [providersRes, statsRes] = await Promise.all([
        api.get("/api-providers", { params }),
        api.get("/api-providers/statistics"),
      ]);

      setProviders(
        Array.isArray(providersRes.data?.providers)
          ? providersRes.data.providers
          : Array.isArray(providersRes.data?.data)
            ? providersRes.data.data
            : []
      );

      setStats(statsRes.data?.stats || {});
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to load providers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [status]);

  const filteredProviders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return providers;
    }

    return providers.filter((provider) =>
      [
        provider.name,
        provider.code,
        provider.baseUrl,
        provider.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [providers, search]);

  const chooseProvider = (providerType) => {
    const selected =
      PROVIDER_OPTIONS.find(
        (item) => item.value === providerType
      ) || PROVIDER_OPTIONS[0];

    setForm((current) => ({
      ...current,
      providerType: selected.value,
      name:
        selected.value === "CUSTOM"
          ? ""
          : selected.name,
      code:
        selected.value === "CUSTOM"
          ? ""
          : selected.code,
      baseUrl: selected.baseUrl,
      description: selected.description,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (provider) => {
    const providerType = getProviderType(provider);

    setEditing(provider);

    setForm({
      providerType,
      name: provider.name || "",
      code: provider.code || "",
      baseUrl: provider.baseUrl || "",
      status: provider.status || "ACTIVE",
      description: provider.description || "",
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

  const submitProvider = async () => {
    const name = form.name.trim();
    const code = normalizeProviderCode(form.code);
    const baseUrl = form.baseUrl.trim();
    const description = form.description.trim();

    if (!name) {
      setMessage("Please select or enter a provider name.");
      return;
    }

    if (!code) {
      setMessage("Provider code is required.");
      return;
    }

    if (!baseUrl) {
      setMessage("Please enter the provider base URL.");
      return;
    }

    try {
      new URL(baseUrl);
    } catch {
      setMessage(
        "Please enter a valid base URL beginning with http:// or https://."
      );
      return;
    }

    const payload = {
      name,
      code,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      status: form.status,
      description,
    };

    try {
      setSaving(true);
      setMessage("");

      if (editing) {
        await api.patch(
          `/api-providers/${editing.id}`,
          payload
        );

        setMessage("Provider updated successfully.");
      } else {
        await api.post("/api-providers", payload);
        setMessage("Provider created successfully.");
      }

      closeForm();
      await loadProviders();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to save provider."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (provider) => {
    try {
      setMessage("");

      const nextStatus =
        provider.status === "ACTIVE"
          ? "DISABLED"
          : "ACTIVE";

      await api.patch(
        `/api-providers/${provider.id}/status`,
        {
          status: nextStatus,
        }
      );

      setMessage(
        `Provider status changed to ${nextStatus}.`
      );

      await loadProviders();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to update status."
      );
    }
  };

  const deleteProvider = async (provider) => {
    if (!confirm(`Delete ${provider.name}?`)) {
      return;
    }

    try {
      setMessage("");

      await api.delete(
        `/api-providers/${provider.id}`
      );

      setMessage("Provider deleted successfully.");
      await loadProviders();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to delete provider."
      );
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
      description="Choose a known provider; its name, code and description will be filled automatically."
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
              title: "Total Providers",
              value:
                stats.total ??
                providers.length,
              icon: <Server />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ??
                providers.filter(
                  (provider) =>
                    provider.status === "ACTIVE"
                ).length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ??
                providers.filter(
                  (provider) =>
                    provider.status !== "ACTIVE"
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
                loadProviders();
              }
            }}
            placeholder="Search providers..."
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
          onClick={loadProviders}
        >
          Refresh
        </ActionButton>

        <ActionButton
          icon={<PlusCircle size={18} />}
          onClick={openCreate}
        >
          Add Provider
        </ActionButton>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="hidden grid-cols-7 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 xl:grid">
          <span>Name</span>
          <span>Code</span>
          <span>Base URL</span>
          <span>Status</span>
          <span>Services</span>
          <span>Created</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredProviders.length === 0 ? (
            <div className="p-8 text-slate-500">
              No providers found.
            </div>
          ) : (
            filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="grid items-center gap-4 px-6 py-5 xl:grid-cols-7"
              >
                <div>
                  <h3 className="font-bold">
                    {provider.name}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {provider.description ||
                      "No description"}
                  </p>
                </div>

                <span className="text-slate-400">
                  {provider.code}
                </span>

                <span className="break-all text-slate-400">
                  {provider.baseUrl || "-"}
                </span>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs ${
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
                    ? new Date(
                        provider.createdAt
                      ).toLocaleDateString()
                    : "-"}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Edit provider"
                    onClick={() =>
                      openEdit(provider)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    type="button"
                    title={
                      provider.status === "ACTIVE"
                        ? "Disable provider"
                        : "Activate provider"
                    }
                    onClick={() =>
                      changeStatus(provider)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    type="button"
                    title="Delete provider"
                    onClick={() =>
                      deleteProvider(provider)
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
              {editing
                ? "Edit Provider"
                : "Add Provider"}
            </h2>

            <p className="mb-6 text-sm text-slate-400">
              Select a provider. Its details will be
              completed automatically; only confirm or
              change the base URL when necessary.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Select Provider"
                value={form.providerType}
                onChange={chooseProvider}
              >
                {PROVIDER_OPTIONS.map(
                  (provider) => (
                    <option
                      key={provider.value}
                      value={provider.value}
                    >
                      {provider.name}
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
                label="Provider Name"
                value={form.name}
                onChange={(value) =>
                  setForm({
                    ...form,
                    name: value,
                  })
                }
                readOnly={!customProvider}
                placeholder="Provider name"
              />

              <Input
                label="Provider Code"
                value={form.code}
                onChange={(value) =>
                  setForm({
                    ...form,
                    code:
                      normalizeProviderCode(
                        value
                      ),
                  })
                }
                readOnly={!customProvider}
                placeholder="PROVIDER_CODE"
              />

              <div className="md:col-span-2">
                <Input
                  label="Base URL"
                  value={form.baseUrl}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      baseUrl: value,
                    })
                  }
                  placeholder="https://api.provider.com"
                />
              </div>

              <div className="md:col-span-2">
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      description: value,
                    })
                  }
                  readOnly={!customProvider}
                  placeholder="Provider description"
                />
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Provider preview
                </p>

                <p className="mt-2 font-semibold">
                  {form.name || "Provider name"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {form.code ||
                    "PROVIDER_CODE"}
                </p>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {form.baseUrl ||
                    "Base URL not entered"}
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
                onClick={submitProvider}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Provider"
                    : "Create Provider"}
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
  readOnly = false,
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={`mt-2 w-full rounded-2xl border border-slate-800 px-4 py-3 outline-none ${
          readOnly
            ? "cursor-not-allowed bg-slate-900 text-slate-500"
            : "bg-slate-950 focus:border-blue-500"
        }`}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <textarea
        rows={3}
        value={value}
        readOnly={readOnly}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className={`mt-2 w-full resize-none rounded-2xl border border-slate-800 px-4 py-3 outline-none ${
          readOnly
            ? "cursor-not-allowed bg-slate-900 text-slate-500"
            : "bg-slate-950 focus:border-blue-500"
        }`}
      />
    </div>
  );
}