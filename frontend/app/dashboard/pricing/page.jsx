"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  LoaderCircle, 
  Zap, 
  ShieldCheck, 
  Crown,
  Smartphone,
  Wifi,
  FileText,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Hash
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";

const formatNaira = (val) =>
  `₦${Number(val || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const NETWORK_MAP = {
  "1": "MTN",
  "2": "AIRTEL",
  "3": "9MOBILE",
  "4": "GLO",
};

export default function PricingPage() {
  const [pricing, setPricing] = useState([]);
  const [isVipMember, setIsVipMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [networkFilter, setNetworkFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState("");

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPricing = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        
        const res = await api.get("/pricing");

        const rawList =
          res.data?.data?.pricing ||
          res.data?.pricing ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : []);

        if (isMounted) {
          const list = Array.isArray(rawList) ? rawList : [];

          // Normalize Network and Plan IDs across potential backend sources
          const normalized = list.map((item) => {
            const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
            const netId = String(item.networkId || meta.networkId || "").trim();
            const netName = String(item.network || meta.network || NETWORK_MAP[netId] || "").toUpperCase();
            const planIdentifier = String(item.planId || meta.planId || item.serviceCode || "").trim();

            return {
              ...item,
              networkId: netId || null,
              network: netName || null,
              planId: planIdentifier || item.serviceCode,
            };
          });

          setPricing(normalized);
          setIsVipMember(Boolean(res.data?.isVipMember || res.data?.isVip));
        }
      } catch (err) {
        console.error("Pricing fetch error:", err);
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || "Unable to fetch pricing records.");
          setPricing([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPricing();

    return () => {
      isMounted = false;
    };
  }, []);

  const safePricingList = Array.isArray(pricing) ? pricing : [];

  const filteredPricing = useMemo(() => {
    return safePricingList.filter((item) => {
      if (!item) return false;

      const itemCategory = String(item.category || "").toUpperCase();
      const itemTier = String(item.tier || "REGULAR").toUpperCase();
      const itemNetwork = String(item.network || "").toUpperCase();
      const itemNetworkId = String(item.networkId || "");
      const itemPlanId = String(item.planId || "").toLowerCase();

      const matchesCategory =
        categoryFilter === "ALL" || itemCategory === categoryFilter;

      const matchesTier =
        tierFilter === "ALL" || itemTier === tierFilter;

      const matchesNetwork =
        networkFilter === "ALL" ||
        itemNetwork === networkFilter ||
        itemNetworkId === networkFilter;

      const searchTerm = search.trim().toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.serviceName && item.serviceName.toLowerCase().includes(searchTerm)) ||
        (item.serviceCode && item.serviceCode.toLowerCase().includes(searchTerm)) ||
        itemPlanId.includes(searchTerm) ||
        itemNetwork.toLowerCase().includes(searchTerm) ||
        itemNetworkId.includes(searchTerm);

      return matchesCategory && matchesTier && matchesNetwork && matchesSearch;
    });
  }, [safePricingList, categoryFilter, tierFilter, networkFilter, search]);

  return (
    <DashboardLayout
      title="API Rates & Pricing"
      description="Real-time wholesale and retail pricing across all networks, services, and tiers."
    >
      <div className="space-y-6">
        {/* VIP STATUS BANNER */}
        {isVipMember && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 text-amber-300">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">Dedicated VIP Wholesale Channel Active</h4>
                <p className="text-xs text-amber-400/80">
                  Preferential discounted rates have been applied to your terminal across all data and service gateways.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/30">
              VIP Whitelisted
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* FILTERS & SEARCH */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by plan_id, name, or code (e.g. 102, MTN)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* NETWORK FILTER */}
            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Networks</option>
              <option value="MTN">MTN (ID: 1)</option>
              <option value="AIRTEL">AIRTEL (ID: 2)</option>
              <option value="9MOBILE">9MOBILE (ID: 3)</option>
              <option value="GLO">GLO (ID: 4)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="DATA">Data Bundles</option>
              <option value="AIRTIME">Airtime</option>
              <option value="IDENTITY">Identity (NIN/BVN)</option>
              <option value="ELECTRICITY">Electricity Bills</option>
              <option value="CABLE">Cable TV</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Tiers</option>
              <option value="REGULAR">Regular</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
        </div>

        {/* PRICING TABLE */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <LoaderCircle className="animate-spin text-blue-500" size={24} />
            <span>Fetching your personal terminal rates...</span>
          </div>
        ) : filteredPricing.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-500">
            No pricing plans available matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4">Network & Plan ID</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Your Price</th>
                  <th className="px-6 py-4">Validity / Spec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPricing.map((item, idx) => {
                  const cat = String(item?.category || "").toUpperCase();
                  const tier = String(item?.tier || "REGULAR").toUpperCase();
                  const isCustom = Boolean(item?.isCustomRate || isVipMember);
                  const planIdentifier = item.planId || item.serviceCode;

                  return (
                    <tr 
                      key={item?.id || idx} 
                      className={`transition-colors ${isCustom ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.06]" : "hover:bg-slate-800/30"}`}
                    >
                      {/* SERVICE NAME */}
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          {cat === "DATA" && <Wifi size={16} className="text-blue-400 shrink-0" />}
                          {cat === "AIRTIME" && <Smartphone size={16} className="text-green-400 shrink-0" />}
                          {cat === "IDENTITY" && <FileText size={16} className="text-amber-400 shrink-0" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{item?.serviceName || "Service"}</span>
                              {isCustom && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/30">
                                  VIP RATE
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500">{item?.serviceCode || "-"}</div>
                          </div>
                        </div>
                      </td>

                      {/* NETWORK ID & PLAN ID DISPATCH DETAILS */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.networkId && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-max">
                              <Hash size={10} /> net_id: <strong>{item.networkId}</strong>
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              plan_id: {planIdentifier}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(planIdentifier, `plan-${item.id || idx}`)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Copy Plan ID"
                            >
                              {copiedId === `plan-${item.id || idx}` ? (
                                <Check size={12} className="text-green-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                          {item?.category || "-"}
                        </span>
                      </td>

                      {/* TIER */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isCustom
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : tier === "PREMIUM"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : tier === "STANDARD"
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isCustom ? (
                            <>
                              <Zap size={12} className="text-amber-400" />
                              VIP TIER
                            </>
                          ) : (
                            <>
                              {tier === "PREMIUM" && <Crown size={12} />}
                              {tier === "STANDARD" && <Zap size={12} />}
                              {tier === "REGULAR" && <ShieldCheck size={12} />}
                              {tier}
                            </>
                          )}
                        </span>
                      </td>

                      {/* PRICE */}
                      <td className="px-6 py-4 font-bold text-base">
                        <span className={isCustom ? "text-amber-400" : "text-white"}>
                          {formatNaira(item?.sellingPrice)}
                        </span>
                      </td>

                      {/* VALIDITY */}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {item?.validity || (item?.validityDays ? `${item.validityDays} Days` : "-")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}