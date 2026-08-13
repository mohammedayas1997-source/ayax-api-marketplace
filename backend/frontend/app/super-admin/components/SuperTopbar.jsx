"use client";

import { Bell, Menu, Search } from "lucide-react";

export default function SuperTopbar({ title = "Super Admin Control Center" }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <p className="text-slate-400 mt-2">
          Monitor users, staff, wallets, pricing, refunds, GSM gateway and system health.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4">
          <Search size={18} className="text-slate-500" />
          <input
            placeholder="Search everything..."
            className="bg-transparent py-3 outline-none text-white placeholder:text-slate-600"
          />
        </div>

        <button className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <Bell size={20} className="text-blue-400" />
        </button>

        <button className="lg:hidden bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
}