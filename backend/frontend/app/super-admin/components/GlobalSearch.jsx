"use client";

import { useMemo, useState } from "react";
import {
  Search,
  User,
  Wallet,
  CreditCard,
  RefreshCcw,
  Ticket,
  Smartphone,
  Database,
  ShieldCheck,
} from "lucide-react";

const mockData = [
  {
    id: "CUS-1001",
    title: "Tech Hub Ltd",
    subtitle: "Customer",
    type: "customer",
    path: "/super-admin/customers/CUS-1001",
  },
  {
    id: "FUND-1001",
    title: "Funding Request ₦50,000",
    subtitle: "Funding",
    type: "funding",
    path: "/super-admin/funding",
  },
  {
    id: "REF-1002",
    title: "Refund Request",
    subtitle: "Refund",
    type: "refund",
    path: "/super-admin/refund",
  },
  {
    id: "SIM-12",
    title: "SIM 12",
    subtitle: "GSM Gateway",
    type: "gsm",
    path: "/super-admin/gsm-gateway",
  },
  {
    id: "PLAN-1001",
    title: "MTN SME 1GB",
    subtitle: "Pricing",
    type: "pricing",
    path: "/super-admin/pricing",
  },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query) return [];

    const q = query.toLowerCase();

    return mockData.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4">
        <Search size={18} className="text-slate-500" />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers, funding, refund, SIM, pricing..."
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-500"
        />
      </div>

      {query && (
        <div className="absolute mt-3 w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-50">
          {results.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No result found.
            </div>
          ) : (
            results.map((item) => (
              <a
                key={item.id}
                href={item.path}
                className="flex items-center gap-4 p-5 hover:bg-slate-800 transition"
              >
                <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <SearchIcon type={item.type} />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-slate-500">
                    {item.subtitle}
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {item.id}
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon({ type }) {
  switch (type) {
    case "customer":
      return <User size={18} />;
    case "funding":
      return <CreditCard size={18} />;
    case "refund":
      return <RefreshCcw size={18} />;
    case "gsm":
      return <Smartphone size={18} />;
    case "pricing":
      return <Database size={18} />;
    default:
      return <ShieldCheck size={18} />;
  }
}