"use client";

import { SearchX, PlusCircle, RefreshCcw } from "lucide-react";

export default function EmptyState({
  title = "No data found",
  description = "There are no records to display right now.",
  actionLabel,
  onAction,
  refreshLabel = "Refresh",
  onRefresh,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
      <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <SearchX size={40} className="text-slate-600" />
      </div>

      <h2 className="text-2xl font-extrabold">{title}</h2>

      <p className="text-slate-500 mt-3 max-w-md mx-auto leading-7">
        {description}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {actionLabel && (
          <button
            onClick={onAction}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
          >
            <PlusCircle size={18} />
            {actionLabel}
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
          >
            <RefreshCcw size={18} />
            {refreshLabel}
          </button>
        )}
      </div>
    </div>
  );
}