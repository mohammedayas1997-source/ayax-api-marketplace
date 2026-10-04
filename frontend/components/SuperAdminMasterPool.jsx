"use client";

import React, { useState, useEffect } from "react";

export default function SuperAdminMasterPool({ apiBase = "/api/v1" }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [rawSims, setRawSims] = useState([]);
  const [selectedSimPhones, setSelectedSimPhones] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("AVAILABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customPlanId, setCustomPlanId] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchSimAvailability(selectedPlanId);
    }
  }, [selectedPlanId]);

  const fetchPlans = async () => {
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
      console.error(err);
    }
  };

  const fetchSimAvailability = async (planId) => {
    setLoading(true);
    setSelectedSimPhones(new Set());
    try {
      const res = await fetch(`${apiBase}/admin/gateway/plan-pool/availability?planId=${planId}`);
      const data = await res.json();
      setRawSims(data.sims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomPlanMapping = () => {
    if (!customPlanId.trim()) return alert("Enter a valid Plan ID (e.g. MTN_1GB_HOT)");
    const newId = customPlanId.trim();
    if (plans.some(p => p.planId === newId)) return alert("Plan ID already exists");
    
    const updated = [{ planId: newId, name: `Custom Tariff: ${newId}`, price: 0 }, ...plans];
    setPlans(updated);
    setSelectedPlanId(newId);
    setCustomPlanId("");
  };

  const handleSaveMasterPool = async (actionType) => {
    if (!selectedPlanId) return alert("Select a Plan ID first.");
    const phones = Array.from(selectedSimPhones);
    if (phones.length === 0 && actionType !== "REPLACE") {
      return alert("Please select at least one SIM.");
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/admin/gateway/plan-pool/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          simPhones: phones,
          action: actionType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`[SUPER ADMIN] Plan [${selectedPlanId}] is now bound to ${data.totalAssigned} SIM(s) across Ayax Web, Mobile App & API Marketplace! 🚀`);
        fetchSimAvailability(selectedPlanId);
      } else {
        alert(data.message || "Failed to update pool");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
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

  const filteredSims = rawSims.filter((sim) => {
    if (activeFilter === "AVAILABLE" && !sim.isAvailableForTarget) return false;
    if (activeFilter === "CURRENT" && !sim.isCurrentPlanPool) return false;
    const q = searchQuery.toLowerCase();
    return !q || String(sim.phone).includes(q) || String(sim.dataBalance).toLowerCase().includes(q);
  });

  const inPoolCount = rawSims.filter(s => s.isCurrentPlanPool).length;
  const availableCount = rawSims.filter(s => s.isAvailableForTarget && !s.isCurrentPlanPool).length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              SUPER ADMIN MASTER
            </span>
            <span className="text-xs text-slate-400">Universal Platform Routing</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black mt-1">Universal Plan-to-SIM Orchestrator</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Any Plan ID mapped here applies automatically across <strong>Ayax Web</strong>, <strong>Mobile App</strong>, and <strong>API Marketplace</strong>. Out-of-Stock protection halts sales system-wide when pool exhausts.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Total System Gateways</div>
            <div className="text-base font-black text-emerald-400">{rawSims.length} SIMs Online</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Plan IDs (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800">Universal Plan IDs</h3>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
              {plans.length} Plans
            </span>
          </div>

          {/* Quick Create Custom Plan ID */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customPlanId}
              onChange={(e) => setCustomPlanId(e.target.value)}
              placeholder="Custom ID (e.g. 140, MTN_1GB)"
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreateCustomPlanMapping}
              className="px-3 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              + ADD ID
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {plans.map((p) => {
              const isSelected = selectedPlanId === p.planId;
              return (
                <div
                  key={p.planId}
                  onClick={() => setSelectedPlanId(p.planId)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-black text-indigo-700">{p.planId}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Universal</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    {p.name || p.planLabel || "Data Tariff"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: SIM Pool Allocation (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs text-slate-400 uppercase font-black tracking-wider">Universal Binding Target</span>
              <div className="text-lg font-black font-mono text-indigo-600">{selectedPlanId}</div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                🟢 {inPoolCount} In Active Pool
              </span>
              <span className="text-xs font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                ⚡ {availableCount} Unassigned (Kyauta)
              </span>
            </div>
          </div>

          {/* Filters Ribbon */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("AVAILABLE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "AVAILABLE"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ✓ Available Only (Kyauta)
            </button>
            <button
              onClick={() => setActiveFilter("CURRENT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "CURRENT"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🔗 Assigned to This Plan
            </button>
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ☰ All Platform SIMs
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone number, live data balance (e.g. 8GB), or tariff..."
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={toggleSelectAllVisible}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl whitespace-nowrap"
            >
              Select All Filtered
            </button>
          </div>

          {/* SIMs Table */}
          <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Live Data Balance</th>
                  <th className="p-3">Airtime</th>
                  <th className="p-3">Current Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading live gateway SIMs...</td></tr>
                ) : filteredSims.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No SIM cards found matching filter.</td></tr>
                ) : (
                  filteredSims.map((sim) => {
                    const isChecked = selectedSimPhones.has(sim.phone) || sim.isCurrentPlanPool;
                    return (
                      <tr key={sim.phone} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSim(sim.phone)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">{sim.phone}</td>
                        <td className="p-3 font-black text-emerald-600">{sim.dataBalance || "0.00GB"}</td>
                        <td className="p-3 font-bold text-sky-700">{sim.airtimeBalance || "NGN 0.00"}</td>
                        <td className="p-3">
                          {sim.isCurrentPlanPool ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-black text-[10px] border border-indigo-200">
                              Active in this Pool
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
                onClick={() => handleSaveMasterPool("ADD")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "+ ADD TO POOL"}
              </button>
              <button
                disabled={saving}
                onClick={() => handleSaveMasterPool("REPLACE")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "OVERRIDE UNIVERSAL POOL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
