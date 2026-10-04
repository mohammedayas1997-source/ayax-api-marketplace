"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Plus,
  ShieldCheck,
  Zap,
  HardDrive,
  CreditCard,
  SlidersHorizontal,
  Info,
  Check,
  PhoneCall,
  Server,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function DeveloperSimPool({ apiBase = "/api/v1" }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [rawSims, setRawSims] = useState([]);
  const [selectedSimPhones, setSelectedSimPhones] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("AVAILABLE"); // "AVAILABLE", "CURRENT", "ALL"
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingBalances, setRefreshingBalances] = useState(false);

  // Fallback to API Marketplace Toggle
  const [fallbackToMarketplace, setFallbackToMarketplace] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchSimAvailability(selectedPlanId);
    }
  }, [selectedPlanId]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`${apiBase}/data/plans`);
      const data = await res.json();
      const list = data.plans || data.data || [
        { planId: "mtn-tr-1gb-7days", name: "MTN 1GB (7 Days)", price: 400 },
        { planId: "mtn-tr-1gb", name: "MTN 1GB (30 Days)", price: 500 },
        { planId: "mtn-tr-2gb-7days", name: "MTN 2GB (7 Days)", price: 750 },
        { planId: "mtn-tr-500mb-7days", name: "MTN 500MB (7 Days)", price: 300 },
      ];
      setPlans(list);
      if (list.length > 0 && !selectedPlanId) {
        setSelectedPlanId(list[0].planId);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchSimAvailability = async (planId) => {
    setLoadingSims(true);
    setSelectedSimPhones(new Set());
    try {
      const res = await fetch(`${apiBase}/gateway/plan-pool/availability?planId=${planId}`);
      const data = await res.json();
      setRawSims(data.sims || []);
      if (typeof data.fallbackToMarketplace === "boolean") {
        setFallbackToMarketplace(data.fallbackToMarketplace);
      }
    } catch (err) {
      console.error("Error fetching availability matrix:", err);
    } finally {
      setLoadingSims(false);
    }
  };

  const handleRefreshBalances = async () => {
    setRefreshingBalances(true);
    try {
      const res = await fetch(`${apiBase}/gateway/refresh-balances`, { method: "POST" });
      const data = await res.json();
      alert(data.message || "All SIM balances refreshed successfully!");
      if (selectedPlanId) fetchSimAvailability(selectedPlanId);
    } catch (err) {
      alert("Balance refresh error: " + err.message);
    } finally {
      setRefreshingBalances(false);
    }
  };

  const toggleSelectSim = (phone) => {
    const next = new Set(selectedSimPhones);
    if (next.has(phone)) next.delete(phone);
    else next.add(phone);
    setSelectedSimPhones(next);
  };

  const toggleSelectAllVisible = () => {
    const visible = filteredSims;
    const allSelected = visible.every((s) => selectedSimPhones.has(s.phone));
    const next = new Set(selectedSimPhones);
    visible.forEach((s) => {
      if (allSelected) next.delete(s.phone);
      else next.add(s.phone);
    });
    setSelectedSimPhones(next);
  };

  const handleSavePool = async (actionType) => {
    if (!selectedPlanId) return alert("Select a target Plan ID first.");
    const phones = Array.from(selectedSimPhones);
    if (phones.length === 0 && actionType !== "REPLACE") {
      return alert("Select at least one SIM to proceed.");
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/gateway/plan-pool/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          simPhones: phones,
          action: actionType,
          fallbackToMarketplace: fallbackToMarketplace,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Dedicated SIM pool updated for [${selectedPlanId}]! Total SIMs: ${data.totalAssigned}`);
        fetchSimAvailability(selectedPlanId);
      } else {
        alert(data.message || "Failed to update SIM pool.");
      }
    } catch (err) {
      alert("Network Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMarketplaceFallback = async () => {
    const nextVal = !fallbackToMarketplace;
    setFallbackToMarketplace(nextVal);
    setSavingSettings(true);
    try {
      await fetch(`${apiBase}/gateway/plan-pool/fallback-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          fallbackToMarketplace: nextVal,
        }),
      });
    } catch (_) {
      // Quiet fail or revert if error
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredSims = useMemo(() => {
    return rawSims.filter((sim) => {
      if (activeFilter === "AVAILABLE" && !sim.isAvailableForTarget) return false;
      if (activeFilter === "CURRENT" && !sim.isCurrentPlanPool) return false;
      const q = searchQuery.toLowerCase();
      const phone = String(sim.phone || "");
      const dataBal = String(sim.dataBalance || "").toLowerCase();
      return !q || phone.includes(q) || dataBal.includes(q);
    });
  }, [rawSims, activeFilter, searchQuery]);

  const currentPoolCount = rawSims.filter((s) => s.isCurrentPlanPool).length;
  const availableCount = rawSims.filter((s) => s.isAvailableForTarget && !s.isCurrentPlanPool).length;

  const currentSelectedPlan = plans.find((p) => p.planId === selectedPlanId) || {
    planId: selectedPlanId,
    name: "Selected Bundle",
    price: 400,
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* 1. Executive Top Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Zap className="h-3.5 w-3.5 text-sky-400" />
              <span>Zero-Fee Direct MyMTN Gateway Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Enterprise SIM Pool & Routing Console
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              Assign dedicated SIM pools per Plan ID without capacity limits. Vending dispenses directly from your SIMs with a nominal <strong>₦2.00</strong> platform automation fee, with automated failover protection to the <strong>API Marketplace</strong> when SIM data is depleted.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="flex-1 sm:flex-none rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 min-w-[130px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total SIMs Online</span>
              <div className="text-xl font-black text-white mt-0.5">{rawSims.length}</div>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                <Check className="h-3 w-3" /> Ready to Vend
              </span>
            </div>
            <div className="flex-1 sm:flex-none rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 min-w-[130px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Automation Fee</span>
              <div className="text-xl font-black text-emerald-400 mt-0.5">₦2.00</div>
              <span className="text-[10px] text-slate-400 font-medium">Per Successful TX</span>
            </div>
            <button
              onClick={handleRefreshBalances}
              disabled={refreshingBalances}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 transition shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${refreshingBalances ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshingBalances ? "Syncing..." : "Refresh Balances"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Hybrid Failover & Wallet Automation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Marketplace Fallback Card */}
        <div className="md:col-span-8 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-white p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-600/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Automated Fallback to API Marketplace
                </h3>
                <span className="rounded-md bg-indigo-600/10 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                  SMART FAILOVER
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                When your assigned SIM pool runs out of data or is offline, instantly switch to vending via the <strong>Ayax API Marketplace</strong>. The full plan price (₦{currentSelectedPlan.price || 400}) will be automatically debited from your primary wallet to avoid order disruption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-bold text-slate-700">
              {fallbackToMarketplace ? "Fallback Active" : "Fallback Disabled"}
            </span>
            <button
              onClick={toggleMarketplaceFallback}
              disabled={savingSettings}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                fallbackToMarketplace ? "bg-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  fallbackToMarketplace ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Primary Wallet Automation Fee Notice */}
        <div className="md:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-3.5">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-emerald-600 shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary Wallet Requirement</span>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">
              Maintain funds in your main wallet:
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              • <strong>₦2.00</strong> fee per transaction on own SIM<br />
              • Full plan cost if falling back to API Marketplace
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Plan Selection (4 Cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configured Data Plans</h2>
              <p className="text-xs text-slate-500">Pick a plan to bind dedicated SIMs</p>
            </div>
            <button
              onClick={fetchPlans}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <RotateCw className="h-3 w-3" /> Reload
            </button>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {loadingPlans ? (
              <div className="text-center py-12 text-xs text-slate-400">Loading catalog...</div>
            ) : (
              plans.map((p) => {
                const isSelected = selectedPlanId === p.planId;
                return (
                  <div
                    key={p.planId}
                    onClick={() => setSelectedPlanId(p.planId)}
                    className={`group relative p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-xs font-black text-indigo-700">{p.planId}</div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        ₦{p.price || p.userPrice || 0}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-700 mt-1">
                      {p.name || p.planLabel || "Data Package"}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                        <CheckCircle2 className="h-3 w-3" /> Currently selected for configuration
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: SIM Pool Matrix & Allocation (8 Cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Plan Assignment</span>
              <div className="text-base font-black font-mono text-indigo-600 flex items-center gap-2">
                <span>{selectedPlanId || "Select a Plan"}</span>
                <span className="text-xs font-medium text-slate-500 font-sans">
                  ({currentSelectedPlan.name})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {currentPoolCount} Dedicated SIMs in Pool
              </span>
              <span className="rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 border border-sky-100">
                {availableCount} Available
              </span>
            </div>
          </div>

          {/* Filtering Ribbon & Search */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
              <button
                onClick={() => setActiveFilter("AVAILABLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === "AVAILABLE"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Available (Kyauta)
              </button>
              <button
                onClick={() => setActiveFilter("CURRENT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === "CURRENT"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                In This Pool
              </button>
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Platform SIMs
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone number, live data balance (e.g. 8GB), or tariff..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={toggleSelectAllVisible}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 whitespace-nowrap"
            >
              Select All Visible
            </button>
          </div>

          {/* SIMs Matrix Table */}
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Live Data Balance</th>
                  <th className="p-3">Airtime</th>
                  <th className="p-3">Tariff</th>
                  <th className="p-3">Pool Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loadingSims ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Querying live SIM connections...
                    </td>
                  </tr>
                ) : filteredSims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No SIMs matching selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSims.map((sim) => {
                    const isChecked = selectedSimPhones.has(sim.phone) || sim.isCurrentPlanPool;
                    return (
                      <tr key={sim.phone} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSim(sim.phone)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{sim.phone}</td>
                        <td className="p-3 font-extrabold text-emerald-600">{sim.dataBalance || "0.00GB"}</td>
                        <td className="p-3 font-semibold text-slate-700">{sim.airtimeBalance || "NGN 0.00"}</td>
                        <td className="p-3 text-slate-500">{sim.tariff || "MTN X"}</td>
                        <td className="p-3">
                          {sim.isCurrentPlanPool ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                              <Check className="h-3 w-3" /> In This Pool
                            </span>
                          ) : sim.assignedPlanId ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              Bound: [{sim.assignedPlanId}]
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Available (Kyauta)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Selected for action: <strong className="text-slate-900 font-bold">{selectedSimPhones.size}</strong> SIM card(s)
            </div>

            <div className="flex items-center gap-2.5">
              <button
                disabled={saving}
                onClick={() => handleSavePool("ADD")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Add to Existing Pool"}
              </button>

              <button
                disabled={saving}
                onClick={() => handleSavePool("REPLACE")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
              >
                <Layers className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Selection as Dedicated Pool"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}