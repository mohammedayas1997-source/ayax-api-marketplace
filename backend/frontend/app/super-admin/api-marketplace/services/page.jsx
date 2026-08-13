"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layers,
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

const SERVICE_OPTIONS = [
  {
    value: "DATA",
    name: "Data Purchase",
    code: "DATA_PURCHASE",
    category: "DATA",
    endpoint: "/data/buy",
    method: "POST",
    description: "Purchase mobile data bundles through the selected provider.",
  },
  {
    value: "AIRTIME",
    name: "Airtime Purchase",
    code: "AIRTIME_PURCHASE",
    category: "AIRTIME",
    endpoint: "/airtime/buy",
    method: "POST",
    description: "Purchase airtime through the selected provider.",
  },
  {
    value: "ELECTRICITY",
    name: "Electricity Payment",
    code: "ELECTRICITY_PAYMENT",
    category: "ELECTRICITY",
    endpoint: "/electricity/pay",
    method: "POST",
    description: "Pay electricity bills and purchase meter tokens.",
  },
  {
    value: "CABLE",
    name: "Cable TV Subscription",
    code: "CABLE_SUBSCRIPTION",
    category: "CABLE",
    endpoint: "/cable/subscribe",
    method: "POST",
    description: "Purchase and renew cable television subscriptions.",
  },
  {
    value: "BULK_SMS",
    name: "Bulk SMS",
    code: "BULK_SMS",
    category: "BULK_SMS",
    endpoint: "/sms/send",
    method: "POST",
    description: "Send bulk SMS messages through the selected provider.",
  },
  {
    value: "VERIFY_TRANSACTION",
    name: "Transaction Verification",
    code: "TRANSACTION_VERIFY",
    category: "VERIFY",
    endpoint: "/transactions/verify",
    method: "GET",
    description: "Verify the status of a provider transaction.",
  },
  {
    value: "VERIFY_ACCOUNT",
    name: "Account Verification",
    code: "ACCOUNT_VERIFY",
    category: "VERIFY",
    endpoint: "/verify/account",
    method: "POST",
    description: "Validate customer or utility account details.",
  },
  {
    value: "CUSTOM",
    name: "Custom Service",
    code: "CUSTOM_SERVICE",
    category: "CUSTOM",
    endpoint: "",
    method: "POST",
    description: "Custom API service for a provider.",
  },
];

const CATEGORIES = [
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "BULK_SMS",
  "VERIFY",
  "CUSTOM",
];

const createEmptyForm = () => {
  const service = SERVICE_OPTIONS[0];

  return {
    providerId: "",
    serviceType: service.value,
    name: service.name,
    code: service.code,
    category: service.category,
    endpoint: service.endpoint,
    method: service.method,
    status: "ACTIVE",
    description: service.description,
  };
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const detectServiceType = (service) => {
  const code = normalizeCode(service?.code);

  return (
    SERVICE_OPTIONS.find(
      (item) =>
        item.code === code ||
        item.category === service?.category
    )?.value || "CUSTOM"
  );
};

export default function ApiServicesPage() {
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [editing, setEditing] = useState(null);

  const customService = form.serviceType === "CUSTOM";

  const loadServices = async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      if (search.trim()) params.search = search.trim();
      if (status !== "ALL") params.status = status;
      if (category !== "ALL") params.category = category;

      const [servicesRes, statsRes, providersRes] = await Promise.all([
        api.get("/api-services", { params }),
        api.get("/api-services/statistics"),
        api.get("/api-providers"),
      ]);

      setServices(
        Array.isArray(servicesRes.data?.services)
          ? servicesRes.data.services
          : Array.isArray(servicesRes.data?.data)
            ? servicesRes.data.data
            : []
      );

      setStats(statsRes.data?.stats || {});

      setProviders(
        Array.isArray(providersRes.data?.providers)
          ? providersRes.data.providers
          : Array.isArray(providersRes.data?.data)
            ? providersRes.data.data
            : []
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to load services."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [status, category]);

  const filteredServices = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return services;

    return services.filter((service) =>
      [
        service.name,
        service.code,
        service.category,
        service.endpoint,
        service.provider?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [services, search]);

  const chooseService = (serviceType) => {
    const selected =
      SERVICE_OPTIONS.find(
        (item) => item.value === serviceType
      ) || SERVICE_OPTIONS[0];

    setForm((current) => ({
      ...current,
      serviceType: selected.value,
      name:
        selected.value === "CUSTOM"
          ? ""
          : selected.name,
      code:
        selected.value === "CUSTOM"
          ? ""
          : selected.code,
      category: selected.category,
      endpoint: selected.endpoint,
      method: selected.method,
      description: selected.description,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(createEmptyForm());
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);

    setForm({
      providerId:
        service.providerId ||
        service.provider?.id ||
        "",
      serviceType: detectServiceType(service),
      name: service.name || "",
      code: service.code || "",
      category: service.category || "CUSTOM",
      endpoint: service.endpoint || "",
      method: service.method || "POST",
      status: service.status || "ACTIVE",
      description: service.description || "",
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

  const submitService = async () => {
    if (!form.providerId) {
      setMessage("Please select a provider.");
      return;
    }

    const name = form.name.trim();
    const code = normalizeCode(form.code);
    const endpoint = form.endpoint.trim();
    const description = form.description.trim();

    if (!name) {
      setMessage("Service name is required.");
      return;
    }

    if (!code) {
      setMessage("Service code is required.");
      return;
    }

    if (!endpoint) {
      setMessage("Service endpoint is required.");
      return;
    }

    if (!endpoint.startsWith("/")) {
      setMessage("Endpoint must begin with /, for example /data/buy.");
      return;
    }

    const payload = {
      providerId: form.providerId,
      name,
      code,
      category: form.category,
      endpoint,
      method: form.method,
      status: form.status,
      description,
    };

    try {
      setSaving(true);
      setMessage("");

      if (editing) {
        await api.patch(
          `/api-services/${editing.id}`,
          payload
        );
        setMessage("Service updated successfully.");
      } else {
        await api.post("/api-services", payload);
        setMessage("Service created successfully.");
      }

      closeForm();
      await loadServices();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to save service."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (service) => {
    try {
      setMessage("");

      const nextStatus =
        service.status === "ACTIVE"
          ? "DISABLED"
          : "ACTIVE";

      await api.patch(
        `/api-services/${service.id}/status`,
        { status: nextStatus }
      );

      setMessage(
        `Service status changed to ${nextStatus}.`
      );

      await loadServices();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to update status."
      );
    }
  };

  const deleteService = async (service) => {
    if (!confirm(`Delete ${service.name}?`)) return;

    try {
      setMessage("");
      await api.delete(`/api-services/${service.id}`);
      setMessage("Service deleted successfully.");
      await loadServices();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "Failed to delete service."
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="API Services">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="API Services"
      description="Select a provider and service type; service details are filled automatically."
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
              title: "Total Services",
              value: stats.total ?? services.length,
              icon: <Layers />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ??
                services.filter(
                  (service) =>
                    service.status === "ACTIVE"
                ).length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ??
                services.filter(
                  (service) =>
                    service.status !== "ACTIVE"
                ).length,
              icon: <XCircle />,
              color: "red",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_200px_200px_auto_auto]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} className="text-slate-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                loadServices();
              }
            }}
            placeholder="Search services..."
            className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <select
          value={category}
          onChange={(event) =>
            setCategory(event.target.value)
          }
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 outline-none"
        >
          <option value="ALL">
            All Categories
          </option>

          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

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
          onClick={loadServices}
        >
          Refresh
        </ActionButton>

        <ActionButton
          icon={<PlusCircle size={18} />}
          onClick={openCreate}
        >
          Add Service
        </ActionButton>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="hidden grid-cols-8 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 xl:grid">
          <span>Name</span>
          <span>Code</span>
          <span>Provider</span>
          <span>Category</span>
          <span>Endpoint</span>
          <span>Status</span>
          <span>Method</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-slate-500">
              No services found.
            </div>
          ) : (
            filteredServices.map((service) => (
              <div
                key={service.id}
                className="grid items-center gap-4 px-6 py-5 xl:grid-cols-8"
              >
                <div>
                  <h3 className="font-bold">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {service.description ||
                      "No description"}
                  </p>
                </div>

                <span className="text-slate-400">
                  {service.code}
                </span>

                <span className="text-slate-400">
                  {service.provider?.name || "-"}
                </span>

                <span className="text-slate-400">
                  {service.category}
                </span>

                <span className="break-all text-slate-400">
                  {service.endpoint || "-"}
                </span>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs ${
                    service.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {service.status}
                </span>

                <span className="text-slate-400">
                  {service.method || "POST"}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Edit service"
                    onClick={() => openEdit(service)}
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    type="button"
                    title={
                      service.status === "ACTIVE"
                        ? "Disable service"
                        : "Activate service"
                    }
                    onClick={() =>
                      changeStatus(service)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    type="button"
                    title="Delete service"
                    onClick={() =>
                      deleteService(service)
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
                ? "Edit Service"
                : "Add Service"}
            </h2>

            <p className="mb-6 text-sm text-slate-400">
              Select the provider and service type.
              Name, code, category, endpoint and method
              are completed automatically.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Provider"
                value={form.providerId}
                onChange={(value) =>
                  setForm({
                    ...form,
                    providerId: value,
                  })
                }
              >
                <option value="">
                  Select Provider
                </option>

                {providers.map((provider) => (
                  <option
                    key={provider.id}
                    value={provider.id}
                  >
                    {provider.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Service Type"
                value={form.serviceType}
                onChange={chooseService}
              >
                {SERVICE_OPTIONS.map((service) => (
                  <option
                    key={service.value}
                    value={service.value}
                  >
                    {service.name}
                  </option>
                ))}
              </SelectField>

              <Input
                label="Service Name"
                value={form.name}
                onChange={(value) =>
                  setForm({
                    ...form,
                    name: value,
                  })
                }
                readOnly={!customService}
                placeholder="Service name"
              />

              <Input
                label="Service Code"
                value={form.code}
                onChange={(value) =>
                  setForm({
                    ...form,
                    code: normalizeCode(value),
                  })
                }
                readOnly={!customService}
                placeholder="SERVICE_CODE"
              />

              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) =>
                  setForm({
                    ...form,
                    category: value,
                  })
                }
                disabled={!customService}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Method"
                value={form.method}
                onChange={(value) =>
                  setForm({
                    ...form,
                    method: value,
                  })
                }
                disabled={!customService}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </SelectField>

              <div className="md:col-span-2">
                <Input
                  label="Endpoint"
                  value={form.endpoint}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      endpoint: value,
                    })
                  }
                  readOnly={!customService}
                  placeholder="/data/buy"
                />
              </div>

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

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  Service preview
                </p>
                <p className="mt-2 font-semibold">
                  {form.name || "Service name"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {form.method} {form.endpoint || "/endpoint"}
                </p>
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
                  readOnly={!customService}
                  placeholder="Service description"
                />
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
                onClick={submitService}
                className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Service"
                    : "Create Service"}
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
  disabled = false,
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`mt-2 w-full rounded-2xl border border-slate-800 px-4 py-3 outline-none ${
          disabled
            ? "cursor-not-allowed bg-slate-900 text-slate-500"
            : "bg-slate-950 focus:border-blue-500"
        }`}
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