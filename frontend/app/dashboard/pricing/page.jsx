"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Tags, 
  Search, 
  Filter, 
  LoaderCircle, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Crown,
  Smartphone,
  Wifi,
  FileText
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);
        const res = await api.get("/pricing/public");
        setPricing(res.data?.data || res.data || []);
      } catch (err) {
        console.error("Failed to load pricing:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, []);

  const filteredPricing = useMemo(() => {
    return pricing.filter((item) => {
      const matchesCategory =
        categoryFilter === "ALL" ||
        String(item.category).toUpperCase() === categoryFilter;

      const matchesTier =
        tierFilter === "ALL" ||
        String(item.tier).toUpperCase() === tierFilter;

      const matchesSearch =
        !search ||
        item.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
        item.serviceCode?.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesTier && matchesSearch;
    });
  }, [pricing, categoryFilter, tierFilter, search]);

  return (
    <DashboardLayout
      title="API Rates & Pricing"
      description="Real-time wholesale and retail pricing across all networks, services, and tiers."
    >
      <div className="space-y-6">
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

        {/* PRICING TABLE / LIST */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <LoaderCircle className="animate-spin text-blue-500" size={24} />
            <span>Fetching latest service rates...</span>
          </div>
        ) : filteredPricing.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-500">
            No pricing plans match your criteria.
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
                {filteredPricing.map((item) => {
                  const cat = String(item.category || "").toUpperCase();
                  const tier = String(item.tier || "REGULAR").toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          {cat === "DATA" && <Wifi size={16} className="text-blue-400 shrink-0" />}
                          {cat === "AIRTIME" && <Smartphone size={16} className="text-green-400 shrink-0" />}
                          {cat === "IDENTITY" && <FileText size={16} className="text-amber-400 shrink-0" />}
                          <div>
                            <div>{item.serviceName}</div>
                            <div className="text-xs font-mono text-slate-500">{item.serviceCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                          {item.category}
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
                        {formatNaira(item.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {item.validity || (item.validityDays ? `${item.validityDays} Days` : "-")}
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
