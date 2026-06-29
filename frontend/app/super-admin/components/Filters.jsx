"use client";

import { Filter, Search, RefreshCcw } from "lucide-react";

export default function Filters({
  search,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  onReset,
}) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
      <div className="grid lg:grid-cols-[1fr_auto] gap-4">
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
          <Search size={18} className="text-slate-500" />

          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange?.(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}

          {onReset && (
            <button
              onClick={onReset}
              className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
            >
              <RefreshCcw size={18} />
              Reset
            </button>
          )}

          <div className="bg-blue-500/10 text-blue-400 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2">
            <Filter size={18} />
            Filters
          </div>
        </div>
      </div>
    </section>
  );
}