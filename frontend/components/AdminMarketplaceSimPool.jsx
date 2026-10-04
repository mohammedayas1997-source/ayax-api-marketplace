"use client";

import React, { useState, useEffect } from "react";

export default function AdminMarketplaceSimPool({ apiBase = "/api/v1" }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [rawSims, setRawSims] = useState([]);
  const [selectedSimPhones, setSelectedSimPhones] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("AVAILABLE"); // "AVAILABLE", "CURRENT", "ALL"
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      const res = await fetch(`${apiBase}/gateway/plan-pool/availability?planId=${planId}&developerId=admin_master`);
      const data = await res.json();
      const simList = data.sims || [];
      setRawSims(simList);
    } catch (err) {
      console.error("Error fetching availability matrix:", err);
    } finally {
      setLoadingSims(false);
    }
  };

  const handleRefreshAllBalances = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${apiBase}/gateway/refresh-balances`, { method: "POST" });
      const data = await res.json();
      alert(data.message || "All SIM balances refreshed successfully from MyMTN!");
      if (selectedPlanId) fetchSimAvailability(selectedPlanId);
    } catch (err) {
      alert("Error refreshing balances: " + err.message);
    } finally {
      setRefreshing(false);
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
    if (!selectedPlanId) {
      alert("Please select a target Plan ID first.");
      return;
    }

    const phones = Array.from(selectedSimPhones);
    if (phones.length === 0 && actionType !== "REPLACE") {
      alert("Please select at least one SIM to add.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/gateway/plan-pool/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: "admin_master",
          planId: selectedPlanId,
          simPhones: phones,
          action: actionType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`[ADMIN MASTER POOL] Successfully assigned ${data.totalAssigned} SIM(s) to Plan [${selectedPlanId}]!`);
        fetchSimAvailability(selectedPlanId);
      } else {
        alert(data.message || "Failed to update master pool.");
      }
    } catch (err) {
      alert("Network Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredSims = rawSims.filter((sim) => {
    if (activeFilter === "AVAILABLE" && !sim.isAvailableForTarget) return false;
    if (activeFilter === "CURRENT" && !sim.isCurrentPlanPool) return false;
    const q = searchQuery.toLowerCase();
    const phone = String(sim.phone || "");
    const dataBal = String(sim.dataBalance || "").toLowerCase();
    return !q || phone.includes(q) || dataBal.includes(q);
  });

  const currentPoolCount = rawSims.filter((s) => s.isCurrentPlanPool).length;
  const availableCount = rawSims.filter((s) => s.isAvailableForTarget && !s.isCurrentPlanPool).length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              Admin Master Console
            </span>
            <span className="text-xs text-slate-400">AYAX API Marketplace Engine</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black mt-1">
            Global Marketplace SIM Pool & Routing Orchestrator
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Allocate server-side SIM pools to dispense data when external developers vend through your API.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            disabled={refreshing}
            onClick={handleRefreshAllBalances}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh All Live Balances"}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plans (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-slate-800">API Marketplace Tariffs</span>
            <button
              onClick={fetchPlans}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
            >
              Reload
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Pick a public plan to configure its master SIM delivery pool:
          </p>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {loadingPlans ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading marketplace plans...</div>
            ) : (
              plans.map((p) => {
                const isSelected = selectedPlanId === p.planId;
                return (
                  <div
                    key={p.planId}
                    onClick={() => setSelectedPlanId(p.planId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-mono text-xs font-black text-amber-700">{p.planId}</div>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      {p.name || p.planLabel || "Data Bundle"} • ₦{p.price || p.userPrice || 0}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: SIM Pool Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Active Plan Routing</span>
              <div className="text-base font-black font-mono text-amber-600">
                {selectedPlanId || "Select a Plan"}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                🟢 {currentPoolCount} Active in Pool
              </span>
              <span className="text-xs font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                ⚡ {availableCount} Unassigned (Kyauta)
              </span>
            </div>
          </div>

          {/* Filter Ribbon */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("AVAILABLE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === "AVAILABLE"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ✓ Available Only (Kyauta)
            </button>
            <button
              onClick={() => setActiveFilter("CURRENT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === "CURRENT"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🔗 Dedicated to This Plan
            </button>
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ☰ All Platform SIMs
            </button>
          </div>

          {/* Search & Select All */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone number, data volume (e.g. 8GB), or tariff..."
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button
              onClick={toggleSelectAllVisible}
              className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl whitespace-nowrap"
            >
              Select All Visible
            </button>
          </div>

          {/* Table Wrap */}
          <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Gateway SIM</th>
                  <th className="p-3">Data Balance</th>
                  <th className="p-3">Airtime</th>
                  <th className="p-3">Pool Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loadingSims ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      Querying master SIM pool...
                    </td>
                  </tr>
                ) : filteredSims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No SIM cards matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSims.map((sim) => {
                    const isChecked =
                      selectedSimPhones.has(sim.phone) || sim.isCurrentPlanPool;
                    return (
                      <tr key={sim.phone} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSim(sim.phone)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{sim.phone}</td>
                        <td className="p-3 font-black text-emerald-600">{sim.dataBalance || "0.00GB"}</td>
                        <td className="p-3 font-bold text-sky-700">{sim.airtimeBalance || "NGN 0.00"}</td>
                        <td className="p-3">
                          {sim.isCurrentPlanPool ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-black text-[10px] border border-amber-200">
                              Dedicated to This Plan
                            </span>
                          ) : sim.assignedPlanId ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-black text-[10px] border border-rose-100">
                              Bound: [{sim.assignedPlanId}]
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-100">
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

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 gap-3">
            <span className="text-xs text-slate-500">
              Selected: <strong className="text-slate-900 font-black">{selectedSimPhones.size}</strong> SIM(s)
            </span>
            <div className="flex gap-2">
              <button
                disabled={saving}
                onClick={() => handleSavePool("ADD")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "+ ADD TO MASTER POOL"}
              </button>
              <button
                disabled={saving}
                onClick={() => handleSavePool("REPLACE")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "OVERRIDE MASTER POOL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
