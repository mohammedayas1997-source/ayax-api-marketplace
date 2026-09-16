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
  Layers,
  KeyRound,
  UserCheck,
  Zap,
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
  { label: "NIMC Validation (General)", category: "IDENTITY", code: "NIMC_VALIDATION" },
  { label: "NIMC IPE Clearance", category: "IDENTITY", code: "NIMC_IPE_CLEARANCE" },
  { label: "NIMC Bank Mismatch Validation", category: "IDENTITY", code: "NIMC_BANK_MISMATCH" },
  { label: "NIMC Unactivated Record Sync", category: "IDENTITY", code: "NIMC_UNACTIVATED_SYNC" },
  { label: "NIMC Slip Verification & Print", category: "IDENTITY", code: "NIMC_SLIP_VERIFICATION" },
  { label: "NIN Verification", category: "IDENTITY", code: "NIN_VERIFY" },
  { label: "BVN Verification", category: "IDENTITY", code: "BVN_VERIFY" },
  { label: "Electricity Bill", category: "ELECTRICITY", code: "ELECTRICITY" },
  { label: "Cable TV Subscription", category: "CABLE", code: "CABLE_TV" },
];

const DATA_TYPES = [
  "SME",
  "GIFTING",
  "CORPORATE GIFTING",
  "DIRECT",
  "OTHER",
];

const DATA_SIZES = [
  "500MB",
  "750MB",
  "1GB",
  "1.5GB",
  "2GB",
  "3GB",
  "5GB",
  "7GB",
  "10GB",
  "15GB",
  "20GB",
  "40GB",
  "50GB",
  "75GB",
  "100GB",
  "OTHER",
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

const TIERS = ["REGULAR", "STANDARD", "PREMIUM", "SECRET_VIP"];

const EMPTY_FORM = {
  selectedService: "MTN Data",
  dataType: "SME",
  customDataType: "",
  dataSize: "1GB",
  customDataSize: "",
  validity: "30 Days",
  serviceCode: "MTN_DATA_SME_1GB_30DAYS",
  serviceName: "MTN Data SME 1GB (30 Days)",
  category: "DATA",
  applyToAllTiers: true,
  includeSecretVip: true,
  singleTier: "REGULAR",
  costPrice: "",
  regularPrice: "",
  standardPrice: "",
  premiumPrice: "",
  secretVipPrice: "",
  singleSellingPrice: "",
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
  const [activeTab, setActiveTab] = useState("pricing");
  const [pricing, setPricing] = useState([]);
  const [vipRequests, setVipRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPricing, setSelectedPricing] = useState(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [selectedVipUser, setSelectedVipUser] = useState(null);
  const [vipForm, setVipForm] = useState({
    customMtnPrice: "",
    discountPerGb: "30",
  });

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

  const fetchVipRequests = useCallback(async () => {
    try {
      const res = await api.get("/private-tier/admin/requests");
      const list = res.data?.data || [];
      setVipRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Could not fetch VIP requests:", err?.message);
    }
  }, []);

  const loadPricing = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setMessage("");
        await Promise.all([fetchPricing(), fetchVipRequests()]);
      } catch (error) {
        setMessageType("error");
        setMessage(getErrorMessage(error, "Unable to load service telemetry."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchPricing, fetchVipRequests]
  );

  useEffect(() => {
    loadPricing();

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) socket.auth = { token };
    if (!socket.connected) socket.connect();

    const handlePricingUpdate = () => {
      fetchPricing().catch(console.error);
      fetchVipRequests().catch(console.error);
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
  }, [loadPricing, fetchPricing, fetchVipRequests]);

  const syncServiceDetails = (updated) => {
    const isData = updated.category === "DATA";
    const isIdentity = updated.category === "IDENTITY";
    let sName = updated.selectedService;
    let sCode = normalizeCode(updated.selectedService);

    const effectiveType =
      updated.dataType === "OTHER"
        ? updated.customDataType.trim() || "CUSTOM"
        : updated.dataType;

    const effectiveSize =
      updated.dataSize === "OTHER"
        ? updated.customDataSize.trim() || "CUSTOM"
        : updated.dataSize;

    if (isData) {
      sName = `${updated.selectedService} ${effectiveType} ${effectiveSize} (${updated.validity})`;
      sCode = normalizeCode(
        `${updated.selectedService}_${effectiveType}_${effectiveSize}_${updated.validity}`
      );
    } else if (isIdentity) {
      const foundPreset = PRESET_SERVICES.find((s) => s.label === updated.selectedService);
      sCode = foundPreset?.code || normalizeCode(updated.selectedService);
      sName = updated.selectedService;
    }

    let autoFeatures = `High Speed Verification\nAutomated Response\n24/7 Uptime`;
    if (isData) {
      autoFeatures = `Instant Delivery\nValidity: ${updated.validity}\nType: ${effectiveType}\nAPI Automated`;
    } else if (sCode.includes("IPE")) {
      autoFeatures = `Direct IPE Clearance\nNIMC Portal Synchronization\nInstant Clearance Confirmation`;
    } else if (sCode.includes("NIMC") || sCode.includes("NIN")) {
      autoFeatures = `Direct NIMC Routing\nInstant Validation & Slip Verification\nBiometric Data Synchronization`;
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
        if (found) updated.category = found.category;
      }
      return syncServiceDetails(updated);
    });
  };

  const updateForm = (field, value) => {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === "customDataType" || field === "customDataSize") {
        return syncServiceDetails(updated);
      }
      return updated;
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
      pendingVip: vipRequests.filter((r) => !r.isActive).length,
    };
  }, [pricing, vipRequests]);

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
      customDataType: "",
      dataSize: "1GB",
      customDataSize: "",
      validity: "30 Days",
      serviceCode: item.serviceCode,
      serviceName: item.serviceName,
      category: item.category,
      applyToAllTiers: false,
      includeSecretVip: false,
      singleTier: item.tier,
      costPrice: String(item.costPrice),
      regularPrice: "",
      standardPrice: "",
      premiumPrice: "",
      secretVipPrice: "",
      singleSellingPrice: String(item.sellingPrice),
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

    const features = form.features
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      setMessage("");

      if (selectedPricing || !form.applyToAllTiers) {
        const sellingPrice = Number(form.singleSellingPrice);

        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
          throw new Error("Enter a valid selling price.");
        }
        if (sellingPrice < costPrice) {
          throw new Error("Selling price cannot be lower than cost price.");
        }

        const payload = {
          serviceCode,
          serviceName,
          category: form.category,
          tier: form.singleTier,
          costPrice,
          sellingPrice,
          currency: form.currency,
          enabled: form.enabled,
          features,
        };

        if (selectedPricing?.id) {
          await api.patch(`/pricing/${selectedPricing.id}`, payload);
        } else {
          await api.post("/pricing", payload);
        }
      } else {
        const regPrice = Number(form.regularPrice);
        const stdPrice = Number(form.standardPrice);
        const prmPrice = Number(form.premiumPrice);

        if (
          !Number.isFinite(regPrice) ||
          !Number.isFinite(stdPrice) ||
          !Number.isFinite(prmPrice)
        ) {
          throw new Error("Please provide selling prices for Regular, Standard & Premium tiers.");
        }

        if (regPrice < costPrice || stdPrice < costPrice || prmPrice < costPrice) {
          throw new Error("Selling price cannot be lower than cost price on standard tiers.");
        }

        const tierPayloads = [
          { tier: "REGULAR", sellingPrice: regPrice },
          { tier: "STANDARD", sellingPrice: stdPrice },
          { tier: "PREMIUM", sellingPrice: prmPrice },
        ];

        if (form.includeSecretVip && form.secretVipPrice) {
          const vipPrice = Number(form.secretVipPrice);
          if (Number.isFinite(vipPrice) && vipPrice >= costPrice) {
            tierPayloads.push({ tier: "SECRET_VIP", sellingPrice: vipPrice });
          }
        }

        const payloads = tierPayloads.map((t) => ({
          serviceCode,
          serviceName,
          category: form.category,
          tier: t.tier,
          costPrice,
          sellingPrice: t.sellingPrice,
          currency: form.currency,
          enabled: form.enabled,
          features,
        }));

        await Promise.all(payloads.map((p) => api.post("/pricing", p)));
      }

      setMessageType("success");
      setMessage("Pricing configured and updated successfully.");
      closeModal();
      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(getErrorMessage(error, "Unable to save pricing configurations."));
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
      setMessage(response.data?.message || "Pricing status updated successfully.");
      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(getErrorMessage(error, "Unable to update pricing status."));
    } finally {
      setWorkingId("");
    }
  };

  const deletePricing = async (item) => {
    const confirmed = window.confirm(
      `Delete ${item.serviceName} (${item.tier}) permanently?`
    );
    if (!confirmed) return;

    try {
      setWorkingId(item.id);
      setMessage("");
      const response = await api.delete(`/pricing/${item.id}`);
      setMessageType("success");
      setMessage(response.data?.message || "Pricing deleted successfully.");
      await fetchPricing();
    } catch (error) {
      setMessageType("error");
      setMessage(getErrorMessage(error, "Unable to delete pricing."));
    } finally {
      setWorkingId("");
    }
  };

  const handleActivateVipSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVipUser) return;

    try {
      setSubmitting(true);
      const payload = {
        targetUserId: selectedVipUser.userId,
        customMtnPrice: vipForm.customMtnPrice ? Number(vipForm.customMtnPrice) : null,
        discountPerGb: vipForm.discountPerGb ? Number(vipForm.discountPerGb) : 30,
        action: "APPROVE",
      };

      const res = await api.post("/private-tier/admin/activate", payload);
      if (res.data?.success) {
        setMessageType("success");
        setMessage(`Activated ${selectedVipUser.userEmail} on Private Secret Tier!`);
        setVipModalOpen(false);
        setSelectedVipUser(null);
        await fetchVipRequests();
      }
    } catch (err) {
      setMessageType("error");
      setMessage(getErrorMessage(err, "VIP activation failed."));
    } finally {
      setSubmitting(false);
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

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `service-pricing-${new Date().toISOString().split("T")[0]}.csv`;
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
          <SuperTopbar title="Service Pricing & VIP Engine" />

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

          {/* TELEMETRY CARDS */}
          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat title="Total Pricing" value={stats.total} icon={<Tags />} />
            <Stat title="Active" value={stats.active} icon={<Power />} />
            <Stat
              title="Pending VIP Requests"
              value={stats.pendingVip}
              icon={<KeyRound className="text-amber-400" />}
            />
            <Stat
              title="Combined Margin"
              value={formatNaira(stats.profit)}
              icon={<TrendingUp />}
            />
          </section>

          {/* DUAL MODE SELECTOR */}
          <div className="mb-6 flex gap-3 border-b border-slate-800 pb-4">
            <button
              onClick={() => setActiveTab("pricing")}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
                activeTab === "pricing"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Tags size={18} />
              Public Service Pricing ({pricing.length})
            </button>

            <button
              onClick={() => setActiveTab("whitelist")}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
                activeTab === "whitelist"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <ShieldCheck size={18} />
              Private VIP Whitelist Approvals ({vipRequests.length})
              {stats.pendingVip > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {stats.pendingVip}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: STANDARD SERVICE PRICING */}
          {activeTab === "pricing" && (
            <>
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
                    Loading pricing telemetry...
                  </div>
                </div>
              ) : filteredPricing.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
                  <Tags size={44} className="mx-auto text-slate-600" />
                  <h2 className="mt-5 text-xl font-bold">No pricing record found</h2>
                  <p className="mt-2 text-slate-400">
                    Create Regular, Standard, Premium or Secret VIP pricing for a service.
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

                        {Array.isArray(item.features) && item.features.length > 0 && (
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
                              <LoaderCircle size={17} className="animate-spin" />
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
            </>
          )}

          {/* TAB 2: PRIVATE VIP WHITELIST APPROVALS */}
          {activeTab === "whitelist" && (
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">API Customers VIP Requests</h3>
                  <p className="text-sm text-slate-400">
                    Authorize accounts for dedicated secret wholesale rates on backend dispatch.
                  </p>
                </div>
                <button
                  onClick={fetchVipRequests}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 font-semibold text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCcw size={16} /> Refresh Requests
                </button>
              </div>

              {vipRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
                  <UserCheck size={40} className="mx-auto mb-3 opacity-40" />
                  No customer has submitted API credentials for VIP activation yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-3">Customer Email</th>
                        <th className="pb-3">API Key Verified</th>
                        <th className="pb-3">Discount / Custom Rate</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {vipRequests.map((req) => (
                        <tr key={req.id}>
                          <td className="py-4 font-semibold text-white">
                            {req.userEmail}
                          </td>
                          <td className="py-4 font-mono text-xs text-sky-400">
                            {req.apiKey ? `${req.apiKey.slice(0, 10)}...${req.apiKey.slice(-6)}` : "None"}
                          </td>
                          <td className="py-4 text-slate-300">
                            {req.customMtnPrice ? `₦${req.customMtnPrice} Fixed` : `₦${req.discountPerGb} Off / GB`}
                          </td>
                          <td className="py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                req.isActive
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {req.isActive ? "ACTIVE VIP" : req.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedVipUser(req);
                                setVipForm({
                                  customMtnPrice: req.customMtnPrice ? String(req.customMtnPrice) : "",
                                  discountPerGb: req.discountPerGb ? String(req.discountPerGb) : "30",
                                });
                                setVipModalOpen(true);
                              }}
                              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                            >
                              {req.isActive ? "Edit Price" : "Configure & Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>
      </div>

      {/* MODAL 1: ADD/EDIT PRICING */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedPricing ? "Edit Service Pricing" : "Add Service Pricing"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Automatic package builder and multi-tier pricing configuration.
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
                {/* SECTION 1: SERVICE CONFIGURATION */}
                <div className="grid gap-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 sm:grid-cols-2">
                  <FormSelect
                    label="Service Name (Select Service)"
                    value={form.selectedService}
                    onChange={(value) => handleSelectionChange("selectedService", value)}
                    options={PRESET_SERVICES.map((s) => s.label)}
                  />

                  <FormSelect
                    label="Category"
                    value={form.category}
                    onChange={(value) => handleSelectionChange("category", value)}
                    options={CATEGORIES}
                  />

                  {form.category === "DATA" && (
                    <>
                      <FormSelect
                        label="Data Plan Type"
                        value={form.dataType}
                        onChange={(value) => handleSelectionChange("dataType", value)}
                        options={DATA_TYPES}
                      />

                      <FormSelect
                        label="Data Volume / Size"
                        value={form.dataSize}
                        onChange={(value) => handleSelectionChange("dataSize", value)}
                        options={DATA_SIZES}
                      />

                      {form.dataType === "OTHER" && (
                        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3 sm:col-span-1">
                          <FormInput
                            label="Custom Plan Type (e.g. DC, Gifting, Coupon)"
                            value={form.customDataType}
                            onChange={(value) => updateForm("customDataType", value)}
                            placeholder="e.g. DC, Direct Coupon, Special"
                            required
                          />
                        </div>
                      )}

                      {form.dataSize === "OTHER" && (
                        <div
                          className={`rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3 ${
                            form.dataType === "OTHER" ? "sm:col-span-1" : "sm:col-span-2"
                          }`}
                        >
                          <FormInput
                            label="Custom Data Size / Volume (e.g. 250MB, 2.5GB, 12GB)"
                            value={form.customDataSize}
                            onChange={(value) => updateForm("customDataSize", value)}
                            placeholder="e.g. 2.5GB, 750MB, 12GB"
                            required
                          />
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <FormSelect
                          label="Validity (Expiring Days)"
                          value={form.validity}
                          onChange={(value) => handleSelectionChange("validity", value)}
                          options={VALIDITY_OPTIONS.map((v) => v.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* SECTION 2: BATCH MULTI-TIER WITH SECRET_VIP OPTION */}
                {!selectedPricing && (
                  <div className="space-y-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.applyToAllTiers}
                        onChange={(e) => updateForm("applyToAllTiers", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                      />
                      <span className="flex items-center gap-2 font-medium text-blue-300">
                        <Layers size={18} />
                        Configure & Create All Tiers (Regular, Standard, Premium) at Once
                      </span>
                    </label>

                    {form.applyToAllTiers && (
                      <label className="flex cursor-pointer items-center gap-3 pl-7">
                        <input
                          type="checkbox"
                          checked={form.includeSecretVip}
                          onChange={(e) => updateForm("includeSecretVip", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                        />
                        <span className="flex items-center gap-2 text-sm font-medium text-amber-300">
                          <Zap size={16} />
                          Include Hidden Private Tier (Secret VIP Whitelist Rate)
                        </span>
                      </label>
                    )}
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormInput
                    label="Cost Price (Naira)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(value) => updateForm("costPrice", value)}
                    placeholder="e.g. 210"
                    required
                  />

                  {!selectedPricing && form.applyToAllTiers ? (
                    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Tier Selling Prices
                      </p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <FormInput
                          label="Regular Tier"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.regularPrice}
                          onChange={(val) => updateForm("regularPrice", val)}
                          placeholder="250"
                          required
                        />
                        <FormInput
                          label="Standard Tier"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.standardPrice}
                          onChange={(val) => updateForm("standardPrice", val)}
                          placeholder="240"
                          required
                        />
                        <FormInput
                          label="Premium Tier"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.premiumPrice}
                          onChange={(val) => updateForm("premiumPrice", val)}
                          placeholder="230"
                          required
                        />
                      </div>

                      {form.includeSecretVip && (
                        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                          <FormInput
                            label="Secret VIP / Whitelist Price (₦) [Hidden From Regular Users]"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.secretVipPrice}
                            onChange={(val) => updateForm("secretVipPrice", val)}
                            placeholder="e.g. 215 (Lowest Backend Price)"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <FormSelect
                        label="Package Tier"
                        value={form.singleTier}
                        onChange={(value) => updateForm("singleTier", value)}
                        options={TIERS}
                      />

                      <FormInput
                        label="Selling Price (Naira)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.singleSellingPrice}
                        onChange={(value) => updateForm("singleSellingPrice", value)}
                        placeholder="250"
                        required
                      />
                    </>
                  )}

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
                    onChange={(value) => updateForm("serviceCode", normalizeCode(value))}
                    placeholder="AUTO_CODE"
                    required
                  />

                  <FormSelect
                    label="Status"
                    value={form.enabled ? "ACTIVE" : "DISABLED"}
                    onChange={(value) => updateForm("enabled", value === "ACTIVE")}
                    options={["ACTIVE", "DISABLED"]}
                  />

                  <FormInput
                    label="Currency"
                    value={form.currency}
                    onChange={(value) =>
                      updateForm("currency", normalizeCode(value).slice(0, 3))
                    }
                    placeholder="NGN"
                    required
                  />
                </div>

                {/* SECTION 3: FEATURES */}
                <div>
                  <label className="text-sm text-slate-300">
                    Package Features (Auto Generated)
                  </label>
                  <textarea
                    value={form.features}
                    onChange={(event) => updateForm("features", event.target.value)}
                    placeholder={"Validity: 30 Days\nInstant Notification"}
                    rows={3}
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
                      <LoaderCircle size={18} className="animate-spin" />
                      Saving Pricing...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {selectedPricing
                        ? "Save Changes"
                        : form.applyToAllTiers
                        ? `Create Tiers (${form.includeSecretVip ? "Regular, Standard, Premium + VIP" : "Regular, Standard, Premium"})`
                        : "Create Pricing"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ACTIVATE CUSTOMER VIP WHITELIST */}
      {vipModalOpen && selectedVipUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Configure Private Tier</h3>
              <button
                onClick={() => setVipModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-xs text-slate-400">
              Activating account: <span className="font-semibold text-white">{selectedVipUser.userEmail}</span>
            </p>

            <form onSubmit={handleActivateVipSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Fixed MTN 1GB Rate (₦) (Optional override)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 215"
                  value={vipForm.customMtnPrice}
                  onChange={(e) => setVipForm({ ...vipForm, customMtnPrice: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Universal Discount Per GB (₦)
                </label>
                <input
                  type="number"
                  value={vipForm.discountPerGb}
                  onChange={(e) => setVipForm({ ...vipForm, discountPerGb: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                  required
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Deduct this margin automatically on every package purchased.
                </span>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setVipModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? "Activating..." : "Authorize & Activate"}
                </button>
              </div>
            </form>
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
      <h2 className="mt-2 break-all text-3xl font-extrabold">{value}</h2>
    </div>
  );
}

function PriceInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-all font-bold text-slate-200">{value}</p>
    </div>
  );
}

function TierBadge({ tier }) {
  const classes = {
    REGULAR: "bg-slate-500/10 text-slate-300",
    STANDARD: "bg-blue-500/10 text-blue-400",
    PREMIUM: "bg-purple-500/10 text-purple-400",
    SECRET_VIP: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
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