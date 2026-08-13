"use client";

import { Search, X } from "lucide-react";

export default function UserSearch({
  value,
  onChange,
  onSearch,
  onClear,
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
        <Search size={18} className="text-slate-500" />

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onSearch) {
              onSearch();
            }
          }}
          placeholder="Search by name, email, phone or ID..."
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
      </div>

      <button
        onClick={onSearch}
        className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-3 font-semibold transition"
      >
        Search
      </button>

      <button
        onClick={onClear}
        className="rounded-2xl bg-slate-800 hover:bg-slate-700 px-4 py-3 transition"
      >
        <X size={18} />
      </button>
    </div>
  );
}