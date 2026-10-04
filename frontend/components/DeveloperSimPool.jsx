"use client";

import React, { useState, useEffect } from "react";

export default function DeveloperSimPool({ apiBase = "/api/v1" }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [rawSims, setRawSims] = useState([]);
  const [selectedSimPhones, setSelectedSimPhones] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState("AVAILABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      console.error("Error fetching availability matrix:", err);
    } finally {
      setLoadingSims(false);
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
    if (!selectedPlanId) return alert("Please select a target Plan ID first.");
    const phones = Array.from(selectedSimPhones);
    if (phones.length === 0 && actionType !== "REPLACE") {
      return alert("Please select at least one SIM to add.");
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! Updated pool for [${selectedPlanId}]. Total Dedicated SIMs: ${data.totalAssigned}`);
        fetchSimAvailability(selectedPlanId);
      } else {
        alert(data.message || "Failed to update pool.");
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

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900">
            Developer Gateway SIM Pool & Plan Mapping
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Dedicated SIM Allocation • Filter Available Only • Live Data & Airtime Balances
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-black border border-sky-100">
          <span>∞</span> Unlimited SIM Pools
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-slate-800">Target Data Plans</span>
            <button onClick={fetchPlans} className="text-xs font-bold text-sky-600 hover:text-sky-700 underline">
              Reload
            </button>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {loadingPlans ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading plans...</div>
            ) : (
              plans.map((p) => {
                const isSelected = selectedPlanId === p.planId;
                return (
                  <div
                    key={p.planId}
                    onClick={() => setSelectedPlanId(p.planId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/60 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-mono text-xs font-black text-sky-700">{p.planId}</div>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      {p.name || p.planLabel || "Data Bundle"} • ₦{p.price || p.userPrice || 0}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Target Plan</span>
              <div className="text-base font-black font-mono text-sky-600">
                {selectedPlanId || "Select a Plan"}
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              🟢 {currentPoolCount} Dedicated SIMs in Pool
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("AVAILABLE")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                activeFilter === "AVAILABLE" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              ✓ Available Only (Kyauta)
            </button>
            <button
              onClick={() => setActiveFilter("CURRENT")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                activeFilter === "CURRENT" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              🔗 In This Pool
            </button>
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                activeFilter === "ALL" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              ☰ All SIMs (Duka)
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phone number, data balance, or tariff..."
              className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none"
            />
            <button
              onClick={toggleSelectAllVisible}
              className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl"
            >
              Select All Visible
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 border-b">
                <tr>
                  <th className="p-3 w-10"></th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Data Balance</th>
                  <th className="p-3">Airtime</th>
                  <th className="p-3">Status / Bound</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingSims ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading SIMs...</td></tr>
                ) : filteredSims.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">No SIMs matching criteria.</td></tr>
                ) : (
                  filteredSims.map((sim) => {
                    const isChecked = selectedSimPhones.has(sim.phone) || sim.isCurrentPlanPool;
                    return (
                      <tr key={sim.phone} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSim(sim.phone)}
                            className="rounded border-slate-300 text-sky-600"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold">{sim.phone}</td>
                        <td className="p-3 font-black text-emerald-600">{sim.dataBalance || "0.00GB"}</td>
                        <td className="p-3 font-bold text-sky-700">{sim.airtimeBalance || "NGN 0.00"}</td>
                        <td className="p-3">
                          {sim.isCurrentPlanPool ? (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold text-[10px]">In This Pool</span>
                          ) : sim.assignedPlanId ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px]">Bound: [{sim.assignedPlanId}]</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">Available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-3 border-t">
            <span className="text-xs text-slate-500">
              Selected: <strong className="text-slate-900">{selectedSimPhones.size}</strong> SIM(s)
            </span>
            <div className="flex gap-2">
              <button
                disabled={saving}
                onClick={() => handleSavePool("ADD")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white"
              >
                {saving ? "Saving..." : "+ ADD TO POOL"}
              </button>
              <button
                disabled={saving}
                onClick={() => handleSavePool("REPLACE")}
                className="px-4 py-2 rounded-xl text-xs font-black bg-sky-600 text-white"
              >
                {saving ? "Saving..." : "SAVE DEDICATED POOL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}