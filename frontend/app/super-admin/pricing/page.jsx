"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Tags,
  PlusCircle,
  Search,
  Save,
  Trash2,
  Power,
  Download,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  X,
  RefreshCcw,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const PRESET_SERVICES = [
  { label: "MTN Data", category: "DATA", code: "MTN" },
  { label: "Airtel Data", category: "DATA", code: "AIRTEL" },
  { label: "Glo Data", category: "DATA", code: "GLO" },
  { label: "9mobile Data", category: "DATA", code: "9MOBILE" },
  { label: "Airtime Topup", category: "AIRTIME", code: "AIRTIME" },
  { label: "NIN Verification", category: "IDENTITY", code: "NIN_VERIFY" },
  { label: "BVN Verification", category: "IDENTITY", code: "BVN_VERIFY" },
  { label: "Electricity Bill", category: "ELECTRICITY", code: "ELECTRICITY" },
  { label: "Cable TV Subscription", category: "CABLE", code: "CABLE_TV" },
];

const DATA_TYPES = ["SME", "GIFTING", "CORPORATE GIFTING", "DIRECT"];

const DATA_SIZES = [
  "500MB",
  "1GB",
  "1.5GB",
  "2GB",
  "3GB",
  "5GB",
  "10GB",
  "15GB",
  "20GB",
  "40GB",
  "50GB",
  "75GB",
  "100GB",
];

const VALIDITY_OPTIONS = [
  { label: "1 Day", value: "1 Day", days: 1 },
  { label: "2 Days", value: "2 Days", days: 2 },
  { label: "7 Days (1 Week)", value: "7 Days", days: 7 },
  { label: "14 Days (2 Weeks)", value: "14 Days", days: 14 },
  { label: "30 Days (1 Month)", value: "30 Days", days: 30 },
  { label: "60 Days (2 Months)", value: "60 Days", days: 60 },
  { label: "90 Days (3 Months)", value: "90 Days", days: 90 },
];

const CATEGORIES = [
  "GSM",
  "DATA",
  "AIRTIME",
  "IDENTITY",
  "UTILITY",
  "ELECTRICITY",
  "CABLE",
  "FINANCE",
  "EDUCATION",
  "AI",
  "OTHER",
];

const TIERS = ["REGULAR", "STANDARD", "PREMIUM"];

const EMPTY_FORM = {
  selectedService: "MTN Data",
  dataType: "SME",
  dataSize: "1GB",
  validity: "30 Days",
  serviceCode: "MTN_DATA_SME_1GB_30DAYS",
  serviceName: "MTN Data SME 1GB (30 Days)",
  category: "DATA",
  tier: "REGULAR",
  costPrice: "",
  sellingPrice: "",
  currency: "NGN",
  enabled: true,
  features: "Instant Automation\nValidity: 30 Days\n24/7 API Dispatch",
};

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeCode = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizePricing = (item = {}) => ({
  id: item.id,
  serviceCode: item.serviceCode || "",
  serviceName: item.serviceName || "Unnamed Service",
  category: String(item.category || "OTHER").toUpperCase(),
  tier: String(item.tier || "REGULAR").toUpperCase(),
  costPrice: Number(item.costPrice || 0),
  sellingPrice: Number(item.sellingPrice || 0),
  currency: item.currency || "NGN",
  enabled: Boolean(item.enabled),
  features: item.features || [],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export default function SuperPricingPage() {
  const [pricing, setPricing] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPricing, setSelectedPricing] = useState(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchPricing = useCallback(async () => {
    const response = await api.get("/pricing");

    const list =
      response.data?.pricing ||
      response.data?.data?.pricing ||
      response.data?.data ||
      [];

    const normalized = Array.isArray(list)
      ? list.map(normalizePricing)
      : [];

    setPricing(normalized);
    return normalized;
  }, []);

  const loadPricing = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");
        await fetchPricing();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(error, "Unable to load service pricing.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPricing]
  );

  useEffect(() => {
    loadPricing();

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handlePricingUpdate = () => {
      fetchPricing().catch(console.error);
    };

    socket.on("pricing-created", handlePricingUpdate);
    socket.on("pricing-updated", handlePricingUpdate);
    socket.on("pricing-status-updated", handlePricingUpdate);
    socket.on("pricing-deleted", handlePricingUpdate);

    return () => {
      socket.off("pricing-created", handlePricingUpdate);
      socket.off("pricing-updated", handlePricingUpdate);
      socket.off("pricing-status-updated", handlePricingUpdate);
      socket.off("pricing-deleted", handlePricingUpdate);
    };
  }, [loadPricing, fetchPricing]);

  // Tsarin sarrafa sunan da code din service kai tsaye (Automatic Generation)
  const syncServiceDetails = (updated) => {
    const isData = updated.category === "DATA";

    let sName = updated.selectedService;
    let sCode = normalizeCode(updated.selectedService);

    if (isData) {
      sName = `${updated.selectedService} ${updated.dataType} ${updated.dataSize} (${updated.validity})`;
      sCode = normalizeCode(
        `${updated.selectedService}_${updated.dataType}_${updated.dataSize}_${updated.validity}`
      );
    }

    const autoFeatures = isData
      ? `Instant Delivery\nValidity: ${updated.validity}\nType: ${updated.dataType}\nAPI Automated`
      : `High Speed Verification\nAutomated Response\n24/7 Uptime`;

    return {
      ...updated,
      serviceName: sName,
      serviceCode: sCode,
      features: autoFeatures,
    };
  };

  const handleSelectionChange = (field, value) => {
    setForm((current) => {
      let updated = { ...current, [field]: value };

      if (field === "selectedService") {
        const found = PRESET_SERVICES.find((s) => s.label === value);
        if (found) {
          updated.category = found.category;
        }
      }

      return syncServiceDetails(updated);
    });
  };

  const filteredPricing = useMemo(() => {
    const searchValue = query.trim().toLowerCase();

    return pricing.filter((item) => {
      const matchesSearch =
        !searchValue ||
        item.serviceName.toLowerCase().includes(searchValue) ||
        item.serviceCode.toLowerCase().includes(searchValue) ||
        item.category.toLowerCase().includes(searchValue) ||
        item.tier.toLowerCase().includes(searchValue);

      const matchesCategory =
        categoryFilter === "ALL" || item.category === categoryFilter;

      const matchesTier =
        tierFilter === "ALL" || item.tier === tierFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.enabled) ||
        (statusFilter === "DISABLED" && !item.enabled);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesTier &&
        matchesStatus
      );
    });
  }, [pricing, query, categoryFilter, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalProfit = pricing.reduce(
      (sum, item) =>
        sum + (item.sellingPrice - item.costPrice),
      0
    );

    return {
      total: pricing.length,
      active: pricing.filter((item) => item.enabled).length,
      disabled: pricing.filter((item) => !item.enabled).length,
      profit: totalProfit,
    };
  }, [pricing]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setSelectedPricing(null);
    setForm(syncServiceDetails(EMPTY_FORM));
    setMessage("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedPricing(item);

    setForm({
      selectedService: item.serviceName,
      dataType: "SME",
      dataSize: "1GB",
      validity: "30 Days",
      serviceCode: item.serviceCode,
      serviceName: item.serviceName,
      category: item.category,
      tier: item.tier,
      costPrice: String(item.costPrice),
      sellingPrice: String(item.sellingPrice),
      currency: item.currency,
      enabled: item.enabled,
      features: Array.isArray(item.features)
        ? item.features.join("\n")
        : "",
    });

    setMessage("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;

    setModalOpen(false);
    setSelectedPricing(null);
    setForm(EMPTY_FORM);
  };

  const submitPricing = async (event) => {
    event.preventDefault();

    const serviceCode = normalizeCode(form.serviceCode);
    const serviceName = form.serviceName.trim();
    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!serviceCode || !serviceName) {
      setMessageType("error");
      setMessage("Service code and service name are required.");
      return;
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setMessageType("error");
      setMessage("Enter a valid cost price.");
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setMessageType("error");
      setMessage("Enter a valid selling price.");
      return;
    }

    if (sellingPrice < costPrice) {
      setMessageType("error");
      setMessage("Selling price cannot be lower than cost price.");
      return;
    }

    const features = form.features
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      serviceCode,
      serviceName,
      category: form.category,
      tier: form.tier,
      costPrice,
      sellingPrice,
      currency: form.currency,
      enabled: form.enabled,
      features,
    };

    try {
      setSubmitting(true);
      setMessage("");

      let response;

      if (selectedPricing?.id) {
        response = await api.patch(
          `/pricing/${selectedPricing.id}`,
          payload
        );
      } else {
        response = await api.post("/pricing", payload);
      }

      setMessageType("success");
      setMessage(
        response.data?.message ||
          (selectedPricing
            ? "Pricing updated successfully."
            : "Pricing created successfully.")
      );

      closeModal();
      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          selectedPricing
            ? "Unable to update pricing."
            : "Unable to create pricing."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item) => {
    try {
      setWorkingId(item.id);
      setMessage("");

      const response = await api.patch(
        `/pricing/${item.id}/status`,
        {
          enabled: !item.enabled,
        }
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Pricing status updated successfully."
      );

      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to update pricing status."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  const deletePricing = async (item) => {
    const confirmed = window.confirm(
      `Delete ${item.serviceName} ${item.tier} pricing permanently?`
    );

    if (!confirmed) return;

    try {
      setWorkingId(item.id);
      setMessage("");

      const response = await api.delete(`/pricing/${item.id}`);

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Pricing deleted successfully."
      );

      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error, "Unable to delete pricing.")
      );
    } finally {
      setWorkingId("");
    }
  };

  const exportCsv = () => {
    if (filteredPricing.length === 0) {
      setMessageType("info");
      setMessage("There is no pricing information to export.");
      return;
    }

    const headers = [
      "Service Code",
      "Service Name",
      "Category",
      "Tier",
      "Cost Price",
      "Selling Price",
      "Profit",
      "Currency",
      "Status",
    ];

    const rows = filteredPricing.map((item) => [
      item.serviceCode,
      item.serviceName,
      item.category,
      item.tier,
      item.costPrice,
      item.sellingPrice,
      item.sellingPrice - item.costPrice,
      item.currency,
      item.enabled ? "ACTIVE" : "DISABLED",
    ]);

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ayax-service-pricing-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <SuperTopbar title="Service Pricing Manager" />

          {message && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
                messageType === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : messageType === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              ) : messageType === "error" ? (
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              )}

              <span>{message}</span>
            </div>
          )}

          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              title="Total Pricing"
              value={stats.total}
              icon={<Tags />}
            />

            <Stat
              title="Active"
              value={stats.active}
              icon={<Power />}
            />

            <Stat
              title="Disabled"
              value={stats.disabled}
              icon={<AlertTriangle />}
            />

            <Stat
              title="Combined Margin"
              value={formatNaira(stats.profit)}
              icon={<TrendingUp />}
            />
          </section>

          <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px_auto_auto]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                <Search size={18} className="text-slate-500" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search service, code, category or tier..."
                  className="w-full bg-transparent py-4 outline-none"
                />
              </div>

              <FilterSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={["ALL", ...CATEGORIES]}
              />

              <FilterSelect
                value={tierFilter}
                onChange={setTierFilter}
                options={["ALL", ...TIERS]}
              />

              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={["ALL", "ACTIVE", "DISABLED"]}
              />

              <button
                type="button"
                onClick={() => loadPricing({ silent: true })}
                disabled={refreshing}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCcw
                  size={18}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
              >
                <PlusCircle size={18} />
                Add Pricing
              </button>
            </div>
          </section>

          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
              <div className="flex items-center gap-3">
                <LoaderCircle size={22} className="animate-spin" />
                Loading pricing...
              </div>
            </div>
          ) : filteredPricing.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
              <Tags size={44} className="mx-auto text-slate-600" />

              <h2 className="mt-5 text-xl font-bold">
                No pricing record found
              </h2>

              <p className="mt-2 text-slate-400">
                Create Regular, Standard or Premium pricing for a service.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700"
              >
                <PlusCircle size={18} />
                Add First Pricing
              </button>
            </div>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {filteredPricing.map((item) => {
                const profit =
                  item.sellingPrice - item.costPrice;

                const profitPercent =
                  item.costPrice > 0
                    ? (profit / item.costPrice) * 100
                    : 0;

                const working = workingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold">
                            {item.serviceName}
                          </h2>

                          <TierBadge tier={item.tier} />

                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              item.enabled
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {item.enabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {item.serviceCode} • {item.category}
                        </p>
                      </div>

                      <ShieldCheck className="text-blue-400" />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                      <PriceInfo
                        label="Cost Price"
                        value={formatNaira(item.costPrice)}
                      />

                      <PriceInfo
                        label="Selling Price"
                        value={formatNaira(item.sellingPrice)}
                      />

                      <PriceInfo
                        label="Profit"
                        value={`${formatNaira(profit)} (${profitPercent.toFixed(
                          1
                        )}%)`}
                      />
                    </div>

                    {Array.isArray(item.features) &&
                      item.features.length > 0 && (
                        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Features
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.features.map((feature) => (
                              <span
                                key={feature}
                                className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        disabled={working}
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50"
                      >
                        <Pencil size={17} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        disabled={working}
                        className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold disabled:opacity-50 ${
                          item.enabled
                            ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        }`}
                      >
                        {working ? (
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Power size={17} />
                        )}

                        {item.enabled ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePricing(item)}
                        disabled={working}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedPricing
                      ? "Edit Service Pricing"
                      : "Add Service Pricing"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Choose service options, validity and pricing tiers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submitPricing} className="space-y-5">
                {/* SASHE NA 1: ZAƁAR SERVICE DA TSARIN DATA */}
                <div className="grid gap-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 sm:grid-cols-2">
                  <FormSelect
                    label="Service Name (Zaɓi Service)"
                    value={form.selectedService}
                    onChange={(value) =>
                      handleSelectionChange("selectedService", value)
                    }
                    options={PRESET_SERVICES.map((s) => s.label)}
                  />

                  <FormSelect
                    label="Category"
                    value={form.category}
                    onChange={(value) =>
                      handleSelectionChange("category", value)
                    }
                    options={CATEGORIES}
                  />

                  {form.category === "DATA" && (
                    <>
                      <FormSelect
                        label="Data Plan Type"
                        value={form.dataType}
                        onChange={(value) =>
                          handleSelectionChange("dataType", value)
                        }
                        options={DATA_TYPES}
                      />

                      <FormSelect
                        label="Data Volume / Size"
                        value={form.dataSize}
                        onChange={(value) =>
                          handleSelectionChange("dataSize", value)
                        }
                        options={DATA_SIZES}
                      />

                      <div className="sm:col-span-2">
                        <FormSelect
                          label="Kwanakin Aiki (Validity / Expiring Days)"
                          value={form.validity}
                          onChange={(value) =>
                            handleSelectionChange("validity", value)
                          }
                          options={VALIDITY_OPTIONS.map((v) => v.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* SASHE NA 2: AUTOMATIC GENERATED NAMES & CODES */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormInput
                    label="Generated Service Name (Auto)"
                    value={form.serviceName}
                    onChange={(value) =>
                      updateForm("serviceName", value)
                    }
                    placeholder="Auto generated"
                    required
                  />

                  <FormInput
                    label="Generated Service Code (Auto)"
                    value={form.serviceCode}
                    onChange={(value) =>
                      updateForm("serviceCode", normalizeCode(value))
                    }
                    placeholder="AUTO_CODE"
                    required
                  />

                  <FormSelect
                    label="Package Tier"
                    value={form.tier}
                    onChange={(value) => updateForm("tier", value)}
                    options={TIERS}
                  />

                  <FormSelect
                    label="Status"
                    value={form.enabled ? "ACTIVE" : "DISABLED"}
                    onChange={(value) =>
                      updateForm("enabled", value === "ACTIVE")
                    }
                    options={["ACTIVE", "DISABLED"]}
                  />

                  <FormInput
                    label="Cost Price (Naira)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(value) =>
                      updateForm("costPrice", value)
                    }
                    placeholder="100"
                    required
                  />

                  <FormInput
                    label="Selling Price (Naira)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(value) =>
                      updateForm("sellingPrice", value)
                    }
                    placeholder="200"
                    required
                  />

                  <FormInput
                    label="Currency"
                    value={form.currency}
                    onChange={(value) =>
                      updateForm(
                        "currency",
                        normalizeCode(value).slice(0, 3)
                      )
                    }
                    placeholder="NGN"
                    required
                  />
                </div>

                {/* SASHE NA 3: FEATURES */}
                <div>
                  <label className="text-sm text-slate-300">
                    Package Features (Auto Generated)
                  </label>

                  <textarea
                    value={form.features}
                    onChange={(event) =>
                      updateForm("features", event.target.value)
                    }
                    placeholder={"Validity: 30 Days\nInstant Notification"}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                      Saving Pricing...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {selectedPricing
                        ? "Save Changes"
                        : "Create Pricing"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 text-blue-400">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="mt-2 break-all text-3xl font-extrabold">
        {value}
      </h2>
    </div>
  );
}

function PriceInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all font-bold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function TierBadge({ tier }) {
  const classes = {
    REGULAR: "bg-slate-500/10 text-slate-300",
    STANDARD: "bg-blue-500/10 text-blue-400",
    PREMIUM: "bg-purple-500/10 text-purple-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs ${
        classes[tier] || classes.REGULAR
      }`}
    >
      {tier}
    </span>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}