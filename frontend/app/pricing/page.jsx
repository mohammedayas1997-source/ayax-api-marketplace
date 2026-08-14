"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Search, Shield, Zap, Sliders, Database, Layers } from "lucide-react";

const initialPricingData = [
  { category: "Data (MTN)", name: "MTN 1GB (SME)", apiPrice: "₦265", userPrice: "₦290", status: "Active" },
  { category: "Data (MTN)", name: "MTN 2GB (SME)", apiPrice: "₦530", userPrice: "₦580", status: "Active" },
  { category: "Data (MTN)", name: "MTN 5GB (SME)", apiPrice: "₦1,325", userPrice: "₦1,450", status: "Active" },
  { category: "Data (MTN)", name: "MTN 10GB (SME)", apiPrice: "₦2,650", userPrice: "₦2,900", status: "Active" },
  { category: "Data (MTN)", name: "MTN 20GB (Corporate)", apiPrice: "₦5,300", userPrice: "₦5,800", status: "Active" },
  { category: "Data (MTN)", name: "MTN 50GB (Corporate)", apiPrice: "₦13,250", userPrice: "₦14,500", status: "Active" },
  { category: "Data (MTN)", name: "MTN 100GB (Corporate)", apiPrice: "₦26,500", userPrice: "₦29,000", status: "Active" },

  { category: "Data (AIRTEL)", name: "Airtel 1GB (CG)", apiPrice: "₦270", userPrice: "₦300", status: "Active" },
  { category: "Data (AIRTEL)", name: "Airtel 2GB (CG)", apiPrice: "₦540", userPrice: "₦600", status: "Active" },
  { category: "Data (AIRTEL)", name: "Airtel 5GB (CG)", apiPrice: "₦1,350", userPrice: "₦1,500", status: "Active" },
  { category: "Data (AIRTEL)", name: "Airtel 10GB (CG)", apiPrice: "₦2,700", userPrice: "₦3,000", status: "Active" },
  { category: "Data (AIRTEL)", name: "Airtel 50GB", apiPrice: "₦13,500", userPrice: "₦15,000", status: "Active" },
  { category: "Data (AIRTEL)", name: "Airtel 100GB", apiPrice: "₦27,000", userPrice: "₦30,000", status: "Active" },

  { category: "Data (GLO)", name: "Glo 1GB (Corporate)", apiPrice: "₦250", userPrice: "₦280", status: "Active" },
  { category: "Data (GLO)", name: "Glo 10GB (Corporate)", apiPrice: "₦2,500", userPrice: "₦2,800", status: "Active" },
  { category: "Data (GLO)", name: "Glo 50GB", apiPrice: "₦12,500", userPrice: "₦14,000", status: "Active" },
  { category: "Data (9MOBILE)", name: "9mobile 1GB", apiPrice: "₦200", userPrice: "₦230", status: "Active" },
  { category: "Data (9MOBILE)", name: "9mobile 10GB", apiPrice: "₦2,000", userPrice: "₦2,300", status: "Active" },

  { category: "Cable TV", name: "DStv Compact", apiPrice: "₦12,500", userPrice: "₦12,700", status: "Active" },
  { category: "Cable TV", name: "GOTv Jolli", apiPrice: "₦3,300", userPrice: "₦3,450", status: "Active" },
  { category: "Utilities (NEPA)", name: "Electricity Unit (Per kWh)", apiPrice: "₦75", userPrice: "₦82", status: "Active" },
  { category: "Verification", name: "NIMC Slip Print / Verification", apiPrice: "₦50", userPrice: "₦100", status: "Active" },
  { category: "Verification", name: "BVN Verification Service", apiPrice: "₦20", userPrice: "₦50", status: "Active" },
];

export default function PricingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Data (MTN)", "Data (AIRTEL)", "Data (GLO)", "Data (9MOBILE)", "Cable TV", "Utilities (NEPA)", "Verification"];

  const filteredPricing = initialPricingData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
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

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Zap size={14} /> Granular Data & Utility Pricing
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Automated Pricing Table <span className="text-blue-500">(1GB - 100GB)</span>
        </h1>
        <p className="text-slate-400 mt-5 max-w-2xl mx-auto text-lg leading-relaxed">
          Configure precise pricing for every data volume tier (from 1GB, 2GB, up to 100GB), alongside electricity bills, cable subscriptions, and verification services.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400">
              <Sliders size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Admin Pricing Control</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Every data package can be configured individually from 1GB to 100GB directly within the Admin Dashboard.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/pricing"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all whitespace-nowrap"
          >
            <Database size={14} /> Manage Data Range Prices
          </Link>
        </div>
      </section>

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
              placeholder="Search 1GB, 2GB, 50GB, NEPA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Service Category</th>
                  <th className="py-4 px-6 font-semibold">Data / Plan (1GB - 100GB+)</th>
                  <th className="py-4 px-6 font-semibold">API Cost</th>
                  <th className="py-4 px-6 font-semibold">User Price</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredPricing.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No pricing plans found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPricing.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs text-blue-400">
                          <Layers size={12} /> {item.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">{item.name}</td>
                      <td className="py-4 px-6 font-mono text-slate-400">{item.apiPrice}</td>
                      <td className="py-4 px-6 font-mono font-bold text-emerald-400">{item.userPrice}</td>
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
                          Buy / Integrate <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-500" />
              <span>Administrators can update pricing for any data volume (1GB to 100GB) at any time directly from the control panel.</span>
            </div>
            <Link
              href="/login"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Login to Admin Panel &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}