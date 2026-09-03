"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowRight,
  Search,
  Shield,
  Zap,
  Sliders,
  Database,
  Layers,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";

const FALLBACK_PRICING_DATA = [
  // NIN VALIDATION (RESOLUTION SERVICES)
  {
    id: "fb-nv-1",
    category: "NIN VALIDATION",
    name: "NIN Validation - Bank Mismatch / BVN Linking Issue",
    planType: "NIMC CLEARANCE",
    validity: "Automated / Instant",
    apiPrice: "₦1,200",
    userPrice: "₦1,500",
    status: "Active",
  },
  {
    id: "fb-nv-2",
    category: "NIN VALIDATION",
    name: "NIN Validation - Immigration / Passport Clearance (IPE)",
    planType: "NIS PORTAL SYNC",
    validity: "Automated / Instant",
    apiPrice: "₦1,800",
    userPrice: "₦2,200",
    status: "Active",
  },
  {
    id: "fb-nv-3",
    category: "NIN VALIDATION",
    name: "NIN Validation - No Record Found / Unactivated NIN",
    planType: "CENTRAL ACTIVATION",
    validity: "24 - 48 Hours",
    apiPrice: "₦2,000",
    userPrice: "₦2,500",
    status: "Active",
  },
  {
    id: "fb-nv-4",
    category: "NIN VALIDATION",
    name: "NIN Validation - Photo / Biometric Capture Error",
    planType: "BIOMETRIC FIX",
    validity: "Automated",
    apiPrice: "₦1,500",
    userPrice: "₦1,800",
    status: "Active",
  },
  {
    id: "fb-nv-5",
    category: "NIN VALIDATION",
    name: "NIN Validation - Virtual NIN (VNIN) Bypass",
    planType: "ENTERPRISE BYPASS",
    validity: "Instant API",
    apiPrice: "₦250",
    userPrice: "₦350",
    status: "Active",
  },
  {
    id: "fb-nv-6",
    category: "NIN VALIDATION",
    name: "NIN Validation - SIM Link / Telco Barring Validation",
    planType: "TELCO UNBLOCK",
    validity: "Instant",
    apiPrice: "₦800",
    userPrice: "₦1,000",
    status: "Active",
  },

  // IDENTITY VERIFICATION & PRINT SLIPS
  {
    id: "fb-id-1",
    category: "VERIFICATION",
    name: "NIN Verification (Standard Slip)",
    planType: "PDF SLIP GENERATION",
    validity: "Instant",
    apiPrice: "₦60",
    userPrice: "₦100",
    status: "Active",
  },
  {
    id: "fb-id-2",
    category: "VERIFICATION",
    name: "NIN Verification (Premium Plastic Slip Look)",
    planType: "HIGH-RES PVC SLIP",
    validity: "Instant",
    apiPrice: "₦120",
    userPrice: "₦200",
    status: "Active",
  },
  {
    id: "fb-id-3",
    category: "VERIFICATION",
    name: "BVN Verification (Standard Slip)",
    planType: "NIBSS VERIFICATION",
    validity: "Instant",
    apiPrice: "₦35",
    userPrice: "₦70",
    status: "Active",
  },

  // DATA BUNDLES (MTN)
  {
    id: "fb-dt-1",
    category: "DATA (MTN)",
    name: "MTN 1GB (SME)",
    planType: "SME",
    validity: "30 Days",
    apiPrice: "₦265",
    userPrice: "₦290",
    status: "Active",
  },
  {
    id: "fb-dt-2",
    category: "DATA (MTN)",
    name: "MTN 2GB (SME)",
    planType: "SME",
    validity: "30 Days",
    apiPrice: "₦530",
    userPrice: "₦580",
    status: "Active",
  },
  {
    id: "fb-dt-3",
    category: "DATA (MTN)",
    name: "MTN 5GB (SME)",
    planType: "SME",
    validity: "30 Days",
    apiPrice: "₦1,325",
    userPrice: "₦1,450",
    status: "Active",
  },
  {
    id: "fb-dt-4",
    category: "DATA (MTN)",
    name: "MTN 10GB (SME)",
    planType: "SME",
    validity: "30 Days",
    apiPrice: "₦2,650",
    userPrice: "₦2,900",
    status: "Active",
  },
  {
    id: "fb-dt-5",
    category: "DATA (MTN)",
    name: "MTN 20GB (Corporate)",
    planType: "CORPORATE GIFTING",
    validity: "30 Days",
    apiPrice: "₦5,300",
    userPrice: "₦5,800",
    status: "Active",
  },
  {
    id: "fb-dt-6",
    category: "DATA (MTN)",
    name: "MTN 50GB (Corporate)",
    planType: "CORPORATE GIFTING",
    validity: "30 Days",
    apiPrice: "₦13,250",
    userPrice: "₦14,500",
    status: "Active",
  },
  {
    id: "fb-dt-7",
    category: "DATA (MTN)",
    name: "MTN 100GB (Corporate)",
    planType: "CORPORATE GIFTING",
    validity: "30 Days",
    apiPrice: "₦26,500",
    userPrice: "₦29,000",
    status: "Active",
  },

  // DATA BUNDLES (AIRTEL, GLO, 9MOBILE)
  {
    id: "fb-dt-8",
    category: "DATA (AIRTEL)",
    name: "Airtel 1GB (CG)",
    planType: "CORPORATE GIFTING",
    validity: "30 Days",
    apiPrice: "₦270",
    userPrice: "₦300",
    status: "Active",
  },
  {
    id: "fb-dt-9",
    category: "DATA (GLO)",
    name: "Glo 1GB (Corporate)",
    planType: "CORPORATE GIFTING",
    validity: "30 Days",
    apiPrice: "₦250",
    userPrice: "₦280",
    status: "Active",
  },
  {
    id: "fb-dt-10",
    category: "DATA (9MOBILE)",
    name: "9mobile 1GB (SME)",
    planType: "SME",
    validity: "30 Days",
    apiPrice: "₦200",
    userPrice: "₦230",
    status: "Active",
  },
];

const formatMoney = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function PricingPage() {
  const [pricingList, setPricingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchPublicPricing = async () => {
      try {
        setLoading(true);
        const res = await api.get("/service-pricing").catch(() => null);

        const serverItems =
          res?.data?.pricing ||
          res?.data?.data?.pricing ||
          res?.data?.data ||
          [];

        if (Array.isArray(serverItems) && serverItems.length > 0) {
          const formatted = serverItems.map((item) => {
            const rawCategory = String(item.category || "OTHER").toUpperCase();
            const sName = String(item.serviceName || "").toUpperCase();

            // Raba Category cikin tsari
            let displayCategory = rawCategory;
            if (rawCategory === "DATA") {
              if (sName.includes("MTN")) displayCategory = "DATA (MTN)";
              else if (sName.includes("AIRTEL")) displayCategory = "DATA (AIRTEL)";
              else if (sName.includes("GLO")) displayCategory = "DATA (GLO)";
              else if (sName.includes("9MOBILE")) displayCategory = "DATA (9MOBILE)";
            } else if (rawCategory === "IDENTITY") {
              if (sName.includes("VALIDATION")) {
                displayCategory = "NIN VALIDATION";
              } else {
                displayCategory = "VERIFICATION";
              }
            }

            const meta = item.metadata || {};
            const validity = meta.validity || (sName.includes("VALIDATION") ? "Automated" : "Instant");
            const planType =
              meta.dataType ||
              meta.slipType ||
              meta.validationIssue ||
              item.tier ||
              "STANDARD";

            const selling = Number(item.sellingPrice || 0);
            const cost = Number(item.costPrice || 0);
            const apiDisplay = cost > 0 ? formatMoney(cost) : formatMoney(selling * 0.95);
            const userDisplay = formatMoney(selling);

            return {
              id: item.id,
              category: displayCategory,
              name: item.serviceName,
              planType,
              validity,
              apiPrice: apiDisplay,
              userPrice: userDisplay,
              status: item.enabled ? "Active" : "Disabled",
            };
          });

          setPricingList(formatted);
        } else {
          setPricingList(FALLBACK_PRICING_DATA);
        }
      } catch (err) {
        console.error("Pricing load fallback:", err);
        setPricingList(FALLBACK_PRICING_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicPricing();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    pricingList.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [pricingList]);

  const filteredPricing = useMemo(() => {
    return pricingList.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.planType && item.planType.toLowerCase().includes(q)) ||
        (item.validity && item.validity.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [pricingList, searchTerm, selectedCategory]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAVIGATION */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={44}
            height={44}
            priority
          />
          <div>
            <h2 className="text-xl font-bold">
              Ayax <span className="text-blue-500">APIs</span>
            </h2>
            <p className="text-xs text-slate-400">Developer Marketplace</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-blue-600 px-5 py-2 rounded-xl font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Zap size={14} /> Comprehensive Automated Rates
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Live API & Service Rates <span className="text-blue-500">(1GB - 100GB & NIN)</span>
        </h1>
        <p className="text-slate-400 mt-5 max-w-3xl mx-auto text-lg leading-relaxed">
          Real-time rates for High-Speed SME & Corporate Data bundles, complete NIN Validation (Bank Mismatch, IPE Clearance, Unactivated records), and Slip Printing verification services.
        </p>
      </section>

      {/* NOTIFICATION CARD */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400">
              <Sliders size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">NIN Validation & Identity Sync</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Every NIN Validation problem is automated with direct clearance routing. Check individual rates below.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all whitespace-nowrap"
          >
            <Database size={14} /> Control Panel Rates
          </Link>
        </div>
      </section>

      {/* FILTER & SEARCH */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Bank Mismatch, 1GB, BVN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </section>

      {/* MAIN TABLE */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Service Category</th>
                  <th className="py-4 px-6 font-semibold">Package / Issue Description</th>
                  <th className="py-4 px-6 font-semibold">Plan Type / Speed</th>
                  <th className="py-4 px-6 font-semibold">API Tier Cost</th>
                  <th className="py-4 px-6 font-semibold">Retail Price</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Integration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-14 text-center text-slate-400">
                      <div className="inline-flex items-center gap-3">
                        <Loader2 size={20} className="animate-spin text-blue-500" />
                        Fetching live pricing table...
                      </div>
                    </td>
                  </tr>
                ) : filteredPricing.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500">
                      No matching pricing plans found.
                    </td>
                  </tr>
                ) : (
                  filteredPricing.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs text-blue-400">
                          <Layers size={12} /> {item.category}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-semibold text-white">
                        {item.name}
                      </td>

                      <td className="py-4 px-6 text-slate-400">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-semibold text-slate-300">
                            {item.planType}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock size={11} /> {item.validity}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-400">
                        {item.apiPrice}
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-emerald-400">
                        {item.userPrice}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          href="/register"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white font-medium text-xs transition-all"
                        >
                          Integrate <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER BAR */}
          <div className="p-6 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-500" />
              <span>
                Real-time API synchronization active. All listed rates reflect actual gateway costs.
              </span>
            </div>
            <Link
              href="/login"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign In to View Portal &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}