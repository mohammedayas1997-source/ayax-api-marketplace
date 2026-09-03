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
  FileText,
  Fingerprint,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

// 1. Jerin manyan Services da ake bayarwa
const PRESET_SERVICES = [
  // DATA SERVICES
  { label: "MTN Data", category: "DATA", code: "MTN_DATA" },
  { label: "Airtel Data", category: "DATA", code: "AIRTEL_DATA" },
  { label: "Glo Data", category: "DATA", code: "GLO_DATA" },
  { label: "9mobile Data", category: "DATA", code: "9MOBILE_DATA" },

  // AIRTIME & UTILITY
  { label: "Airtime Topup", category: "AIRTIME", code: "AIRTIME_VTU" },
  { label: "Electricity Bill", category: "ELECTRICITY", code: "ELECTRICITY" },
  { label: "Cable TV Subscription", category: "CABLE", code: "CABLE_TV" },

  // IDENTITY SERVICES (BVN & NIN)
  {
    label: "BVN Verification (Print Slip)",
    category: "IDENTITY",
    code: "BVN_VERIFY",
  },
  {
    label: "NIN Verification (Print Slip)",
    category: "IDENTITY",
    code: "NIN_VERIFY",
  },
  {
    label: "NIN Validation (Issue Resolution)",
    category: "IDENTITY",
    code: "NIN_VALIDATION",
  },
];

// 2. Jerin Matsalolin NIN Validation daki-daki
const NIN_VALIDATION_ISSUES = [
  {
    id: "BANK_MISMATCH",
    label: "Bank Mismatch / BVN Linking Issue",
    desc: "Resolves NIN rejected by commercial banks due to BVN record mismatch.",
  },
  {
    id: "IMMIGRATION_PASSPORT",
    label: "Immigration / Passport Clearance (IPE)",
    desc: "Enables unverified NIN on Nigeria Immigration Service (NIS) portal.",
  },
  {
    id: "NO_RECORD_FOUND",
    label: "No Record Found / Unactivated NIN",
    desc: "Activates newly enrolled NIN missing from national central database.",
  },
  {
    id: "PHOTO_BIOMETRIC_ERROR",
    label: "Photo / Biometric Capture Error",
    desc: "Fixes missing photo or corrupt biometric payload on NIMC query.",
  },
  {
    id: "VNIN_BYPASS",
    label: "Virtual NIN (VNIN) Validation Bypass",
    desc: "Direct verification bypass for enterprise & corporate integration.",
  },
  {
    id: "TELCO_SIM_BARRING",
    label: "SIM Link / Telco Barring Validation",
    desc: "Resolves SIM registration block on MTN, Airtel, Glo, 9mobile.",
  },
  {
    id: "GENERAL_RECORD_MATCH",
    label: "General Record & Verification Sync",
    desc: "Global re-validation across all government & financial agencies.",
  },
];

// 3. Zaɓin Nau'in Slip don Verification
const SLIP_TYPES = [
  "Standard Slip",
  "Premium Plastic Slip (PVC Look)",
  "Basic Details Slip",
];

// 4. Zaɓin Tsarin Data
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
  "1 Day",
  "2 Days",
  "7 Days (1 Week)",
  "14 Days (2 Weeks)",
  "30 Days (1 Month)",
  "60 Days (2 Months)",
  "90 Days (3 Months)",
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
  slipType: "Standard Slip",
  validationIssue: "BANK_MISMATCH",
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
  metadata: item.metadata || {},
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

    const normalized = Array.isArray(list) ? list.map(normalizePricing) : [];
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
        setMessage(getErrorMessage(error, "Unable to load service pricing."));
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

  // Tsarin sarrafa sunan sabis da Service Code kai tsaye (100% AUTOMATIC)
  const syncServiceDetails = (updated) => {
    const isData = updated.category === "DATA";
    const isIdentity = updated.category === "IDENTITY";

    let sName = updated.selectedService;
    let sCode = normalizeCode(updated.selectedService);
    let autoFeatures = "";

    if (isData) {
      sName = `${updated.selectedService} ${updated.dataType} ${updated.dataSize} (${updated.validity})`;
      sCode = normalizeCode(
        `${updated.selectedService}_${updated.dataType}_${updated.dataSize}_${updated.validity}`
      );
      autoFeatures = `Instant Delivery\nValidity: ${updated.validity}\nPlan Type: ${updated.dataType}\nAPI Automated`;
    } else if (isIdentity) {
      if (updated.selectedService.includes("BVN")) {
        // BVN Verification & Slip Printing
        sName = `BVN Verification (${updated.slipType || "Standard Slip"})`;
        sCode = normalizeCode(
          `BVN_VERIFY_${updated.slipType || "STANDARD_SLIP"}`
        );
        autoFeatures = `Direct NIBSS Integration\nPrintable Slip: ${
          updated.slipType || "Standard Slip"
        }\nInstant Automated Slip Generation\nIncludes Photo & Biometric Details`;
      } else if (updated.selectedService.includes("NIN Verification")) {
        // NIN Verification & Slip Printing
        sName = `NIN Verification (${updated.slipType || "Standard Slip"})`;
        sCode = normalizeCode(
          `NIN_VERIFY_${updated.slipType || "STANDARD_SLIP"}`
        );
        autoFeatures = `Direct NIMC Verification\nHigh Quality Slip: ${
          updated.slipType || "Standard Slip"
        }\nInstant PDF / Slip Return\nFull KYC Demographic Data`;
      } else if (updated.selectedService.includes("NIN Validation")) {
        // NIN Validation Dangane da kowace irin Matsala
        const issueObj =
          NIN_VALIDATION_ISSUES.find(
            (i) => i.id === updated.validationIssue
          ) || NIN_VALIDATION_ISSUES[0];

        sName = `NIN Validation - ${issueObj.label}`;
        sCode = normalizeCode(`NIN_VALIDATION_${issueObj.id}`);
        autoFeatures = `Issue Fixed: ${issueObj.label}\nDescription: ${issueObj.desc}\nAutomated Clearance & Activation\nStatus Sync with NIMC Database`;
      }
    } else {
      autoFeatures =
        "24/7 Instant Execution\nAutomated Webhook Notification\nHigh Reliability";
    }

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

      const matchesTier = tierFilter === "ALL" || item.tier === tierFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.enabled) ||
        (statusFilter === "DISABLED" && !item.enabled);

      return matchesSearch && matchesCategory && matchesTier && matchesStatus;
    });
  }, [pricing, query, categoryFilter, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalProfit = pricing.reduce(
      (sum, item) => sum + (item.sellingPrice - item.costPrice),
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
      dataType: item.metadata?.dataType || "SME",
      dataSize: item.metadata?.dataSize || "1GB",
      validity: item.metadata?.validity || "30 Days",
      slipType: item.metadata?.slipType || "Standard Slip",
      validationIssue: item.metadata?.validationIssue || "BANK_MISMATCH",
      serviceCode: item.serviceCode,
      serviceName: item.serviceName,
      category: item.category,
      tier: item.tier,
      costPrice: String(item.costPrice),
      sellingPrice: String(item.sellingPrice),
      currency: item.currency,
      enabled: item.enabled,
      features: Array.isArray(item.features) ? item.features.join("\n") : "",
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

    // Tattara dukkan Metadata
    const metadata = {
      ...(form.category === "DATA"
        ? {
            dataType: form.dataType,
            dataSize: form.dataSize,
            validity: form.validity,
          }
        : {}),
      ...(form.category === "IDENTITY" &&
      form.selectedService.includes("Verification")
        ? { slipType: form.slipType }
        : {}),
      ...(form.category === "IDENTITY" &&
      form.selectedService.includes("Validation")
        ? { validationIssue: form.validationIssue }
        : {}),
    };

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
      metadata,
    };

    try {
      setSubmitting(true);
      setMessage("");

      let response;

      if (selectedPricing?.id) {
        response = await api.patch(`/pricing/${selectedPricing.id}`, payload);
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

      const response = await api.patch(`/pricing/${item.id}/status`, {
        enabled: !item.enabled,
      });

      setMessageType("success");
      setMessage(
        response.data?.message || "Pricing status updated successfully."
      );

      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(error, "Unable to update pricing status.")
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
        response.data?.message || "Pricing deleted successfully."
      );

      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(getErrorMessage(error, "Unable to delete pricing."));
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
            <Stat title="Total Pricing" value={stats.total} icon={<Tags />} />
            <Stat title="Active" value={stats.active} icon={<Power />} />
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
                  className="w-full bg-transparent py-4 outline-none text-sm"
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
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-50 text-sm"
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
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 text-sm shadow-lg shadow-blue-600/20"
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
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 text-sm"
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

              <p className="mt-2 text-slate-400 text-sm">
                Create Regular, Standard or Premium pricing for services.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 text-sm"
              >
                <PlusCircle size={18} />
                Add First Pricing
              </button>
            </div>
          ) : (
            <section className="grid gap-5 xl:grid-cols-2">
              {filteredPricing.map((item) => {
                const profit = item.sellingPrice - item.costPrice;

                const profitPercent =
                  item.costPrice > 0 ? (profit / item.costPrice) * 100 : 0;

                const working = workingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-white">
                            {item.serviceName}
                          </h2>

                          <TierBadge tier={item.tier} />

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.enabled
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {item.enabled ? "ACTIVE" : "DISABLED"}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-mono text-slate-400">
                          {item.serviceCode} •{" "}
                          <span className="text-blue-400">{item.category}</span>
                        </p>
                      </div>

                      <ShieldCheck className="text-blue-400 shrink-0" />
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
                        label="Profit Margin"
                        value={`${formatNaira(profit)} (${profitPercent.toFixed(
                          1
                        )}%)`}
                      />
                    </div>

                    {Array.isArray(item.features) &&
                      item.features.length > 0 && (
                        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                            Configured Features
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.features.map((feature) => (
                              <span
                                key={feature}
                                className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-300"
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
                        className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStatus(item)}
                        disabled={working}
                        className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${
                          item.enabled
                            ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                        }`}
                      >
                        {working ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Power size={15} />
                        )}

                        {item.enabled ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePricing(item)}
                        disabled={working}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
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

      {/* CREATE & EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedPricing
                      ? "Edit Service Pricing"
                      : "Add Service Pricing"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Automated pricing generation for Data, BVN & NIN Validation
                    issues.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submitPricing} className="space-y-5">
                {/* SASHE NA 1: DYNAMIC SERVICE CONTROLS */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormSelect
                      label="Select Service (Zaɓi Sabis)"
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
                  </div>

                  {/* IDAN TSARIN DATA NE */}
                  {form.category === "DATA" && (
                    <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-slate-800/80">
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

                      <FormSelect
                        label="Validity / Kwanaki"
                        value={form.validity}
                        onChange={(value) =>
                          handleSelectionChange("validity", value)
                        }
                        options={VALIDITY_OPTIONS}
                      />
                    </div>
                  )}

                  {/* IDAN VERIFICATION NE NA BVN KO NIN (PRINT SLIP) */}
                  {form.category === "IDENTITY" &&
                    form.selectedService.includes("Verification") && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <FormSelect
                          label="Nau'in Slip (Slip Type for Printing)"
                          value={form.slipType}
                          onChange={(value) =>
                            handleSelectionChange("slipType", value)
                          }
                          options={SLIP_TYPES}
                        />
                      </div>
                    )}

                  {/* IDAN NIN VALIDATION NE (ALL ISSUES IN NIGERIA) */}
                  {form.category === "IDENTITY" &&
                    form.selectedService.includes("Validation") && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <Fingerprint size={14} /> Zaɓi Matsalar NIN Validation
                          (Issue Type)
                        </label>

                        <select
                          value={form.validationIssue}
                          onChange={(e) =>
                            handleSelectionChange(
                              "validationIssue",
                              e.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                          {NIN_VALIDATION_ISSUES.map((issue) => (
                            <option key={issue.id} value={issue.id}>
                              {issue.label}
                            </option>
                          ))}
                        </select>

                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
                          <strong>Bayani: </strong>
                          {
                            NIN_VALIDATION_ISSUES.find(
                              (i) => i.id === form.validationIssue
                            )?.desc
                          }
                        </div>
                      </div>
                    )}
                </div>

                {/* SASHE NA 2: AUTOMATIC GENERATED NAMES & CODES */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Generated Service Name (Auto)"
                    value={form.serviceName}
                    onChange={(value) => updateForm("serviceName", value)}
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
                    onChange={(value) => updateForm("costPrice", value)}
                    placeholder="100"
                    required
                  />

                  <FormInput
                    label="Selling Price (Naira)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(value) => updateForm("sellingPrice", value)}
                    placeholder="200"
                    required
                  />
                </div>

                {/* SASHE NA 3: AUTOMATIC FEATURES DESCRIPTION */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Package Features (Auto-Generated Details)
                  </label>

                  <textarea
                    value={form.features}
                    onChange={(event) =>
                      updateForm("features", event.target.value)
                    }
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-600/20 text-sm"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      Saving Pricing...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {selectedPricing ? "Save Changes" : "Create Pricing"}
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
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
        {title}
      </p>
      <h2 className="mt-2 break-all text-2xl sm:text-3xl font-extrabold text-white">
        {value}
      </h2>
    </div>
  );
}

function PriceInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </p>

      <p className="mt-2 break-all font-bold text-slate-200 text-sm">{value}</p>
    </div>
  );
}

function TierBadge({ tier }) {
  const classes = {
    REGULAR: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    STANDARD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PREMIUM: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <span
      className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${
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
      className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none text-sm text-slate-300"
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
      <label className="text-xs font-semibold text-slate-300">{label}</label>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-300">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500"
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