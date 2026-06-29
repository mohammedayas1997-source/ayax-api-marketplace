"use client";

import { useEffect, useState } from "react";
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

const emptyForm = {
  providerId: "",
  name: "",
  code: "",
  category: "",
  endpoint: "",
  method: "POST",
  status: "ACTIVE",
  description: "",
};

export default function ApiServicesPage() {
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  const loadServices = async () => {
    try {
      setLoading(true);

      const params = {};
      if (search) params.search = search;
      if (status !== "ALL") params.status = status;
      if (category !== "ALL") params.category = category;

      const [servicesRes, statsRes, providersRes] = await Promise.all([
        api.get("/api-services", { params }),
        api.get("/api-services/statistics"),
        api.get("/api-providers"),
      ]);

      setServices(servicesRes.data.services || []);
      setStats(statsRes.data.stats || {});
      setProviders(providersRes.data.providers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [status, category]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);
    setForm({
      providerId: service.providerId || service.provider?.id || "",
      name: service.name || "",
      code: service.code || "",
      category: service.category || "",
      endpoint: service.endpoint || "",
      method: service.method || "POST",
      status: service.status || "ACTIVE",
      description: service.description || "",
    });
    setFormOpen(true);
  };

  const submitService = async () => {
    try {
      if (editing) {
        await api.patch(`/api-services/${editing.id}`, form);
        setMessage("Service updated successfully.");
      } else {
        await api.post("/api-services", form);
        setMessage("Service created successfully.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save service.");
    }
  };

  const changeStatus = async (service) => {
    try {
      const nextStatus = service.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

      await api.patch(`/api-services/${service.id}/status`, {
        status: nextStatus,
      });

      setMessage(`Service status changed to ${nextStatus}.`);
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update status.");
    }
  };

  const deleteService = async (service) => {
    if (!confirm(`Delete ${service.name}?`)) return;

    try {
      await api.delete(`/api-services/${service.id}`);
      setMessage("Service deleted successfully.");
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete service.");
    }
  };

  const categories = [
    "DATA",
    "AIRTIME",
    "ELECTRICITY",
    "CABLE",
    "BULK_SMS",
    "VERIFY",
    "CUSTOM",
  ];

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
      description="Create and manage API services under each provider."
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
              title: "Total Services",
              value: stats.total || services.length,
              icon: <Layers />,
              color: "blue",
            },
            {
              title: "Active",
              value:
                stats.active ||
                services.filter((s) => s.status === "ACTIVE").length,
              icon: <CheckCircle />,
              color: "green",
            },
            {
              title: "Disabled",
              value:
                stats.disabled ||
                services.filter((s) => s.status !== "ACTIVE").length,
              icon: <XCircle />,
              color: "red",
            },
          ]}
        />
      </div>

      <div className="mb-6 grid lg:grid-cols-[1fr_200px_200px_auto_auto] gap-4">
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services by name, code, endpoint or category..."
            className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
        >
          <option value="ALL">All Categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

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
          onClick={loadServices}
        >
          Refresh
        </ActionButton>

        <ActionButton icon={<PlusCircle size={18} />} onClick={openCreate}>
          Add Service
        </ActionButton>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
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
          {services.length === 0 ? (
            <div className="p-8 text-slate-500">No services found.</div>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
              >
                <div>
                  <h3 className="font-bold">{service.name}</h3>
                  <p className="text-xs text-slate-500">
                    {service.description || "No description"}
                  </p>
                </div>

                <span className="text-slate-400">{service.code}</span>

                <span className="text-slate-400">
                  {service.provider?.name || "-"}
                </span>

                <span className="text-slate-400">{service.category}</span>

                <span className="text-slate-400 break-all">
                  {service.endpoint || "-"}
                </span>

                <span
                  className={`w-fit px-3 py-1 rounded-full text-xs ${
                    service.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {service.status}
                </span>

                <span className="text-slate-400">{service.method || "POST"}</span>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(service)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => changeStatus(service)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                  >
                    <Power size={16} />
                  </button>

                  <button
                    onClick={() => deleteService(service)}
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
              {editing ? "Edit Service" : "Add Service"}
            </h2>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-slate-400">Provider</label>
                <select
                  value={form.providerId}
                  onChange={(e) =>
                    setForm({ ...form, providerId: e.target.value })
                  }
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="">Select Provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Service Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="MTN SME Data"
              />

              <Input
                label="Service Code"
                value={form.code}
                onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
                placeholder="MTN_SME"
              />

              <div>
                <label className="text-sm text-slate-400">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Endpoint"
                value={form.endpoint}
                onChange={(v) => setForm({ ...form, endpoint: v })}
                placeholder="/api/data/buy"
              />

              <div>
                <label className="text-sm text-slate-400">Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

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
                placeholder="Service description"
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
                onClick={submitService}
                className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold"
              >
                {editing ? "Update Service" : "Create Service"}
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