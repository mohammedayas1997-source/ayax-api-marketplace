"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Tags, 
  Search, 
  LoaderCircle, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Crown,
  Smartphone,
  Wifi,
  FileText,
  AlertTriangle
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";

const formatNaira = (val) =>
  `₦${Number(val || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PricingPage() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");

  useEffect(() => {
    let isMounted = true;

    const fetchPricing = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        
        // Zai kira /pricing/public ko /service-pricing
        const res = await api.get("/pricing/public").catch(async () => {
          return await api.get("/service-pricing");
        });

        const rawList =
          res.data?.data ||
          res.data?.pricing ||
          (Array.isArray(res.data) ? res.data : []);

        if (isMounted) {
          setPricing(Array.isArray(rawList) ? rawList : []);
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

      const matchesCategory =
        categoryFilter === "ALL" || itemCategory === categoryFilter;

      const matchesTier =
        tierFilter === "ALL" || itemTier === tierFilter;

      const searchTerm = search.trim().toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.serviceName && item.serviceName.toLowerCase().includes(searchTerm)) ||
        (item.serviceCode && item.serviceCode.toLowerCase().includes(searchTerm));

      return matchesCategory && matchesTier && matchesSearch;
    });
  }, [safePricingList, categoryFilter, tierFilter, search]);

  return (
    <DashboardLayout
      title="API Rates & Pricing"
      description="Real-time wholesale and retail pricing across all networks, services, and tiers."
    >
      <div className="space-y-6">
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
              placeholder="Search services or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="DATA">Data Bundles</option>
              <option value="AIRTIME">Airtime</option>
              <option value="IDENTITY">Identity (NIN/BVN)</option>
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
            <span>Fetching latest service rates...</span>
          </div>
        ) : filteredPricing.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-500">
            No pricing plans available at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Selling Price</th>
                  <th className="px-6 py-4">Validity / Spec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPricing.map((item, idx) => {
                  const cat = String(item?.category || "").toUpperCase();
                  const tier = String(item?.tier || "REGULAR").toUpperCase();

                  return (
                    <tr key={item?.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          {cat === "DATA" && <Wifi size={16} className="text-blue-400 shrink-0" />}
                          {cat === "AIRTIME" && <Smartphone size={16} className="text-green-400 shrink-0" />}
                          {cat === "IDENTITY" && <FileText size={16} className="text-amber-400 shrink-0" />}
                          <div>
                            <div>{item?.serviceName || "Service"}</div>
                            <div className="text-xs font-mono text-slate-500">{item?.serviceCode || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                          {item?.category || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            tier === "PREMIUM"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : tier === "STANDARD"
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tier === "PREMIUM" && <Crown size={12} />}
                          {tier === "STANDARD" && <Zap size={12} />}
                          {tier === "REGULAR" && <ShieldCheck size={12} />}
                          {tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-base">
                        {formatNaira(item?.sellingPrice)}
                      </td>
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
