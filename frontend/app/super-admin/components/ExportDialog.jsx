"use client";

import { useState } from "react";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function ExportDialog({
  open,
  onClose,
  onExport,
  title = "Export Data",
}) {
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    try {
      setLoading(true);

      if (onExport) {
        await onExport({
          format,
          dateRange,
        });
      }

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-5">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">

        <div className="bg-blue-600 p-6 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Download />

            <div>
              <h2 className="font-bold text-xl">
                {title}
              </h2>

              <p className="text-blue-100 text-sm">
                Export system records
              </p>
            </div>
          </div>

          <button onClick={onClose}>
            <X />
          </button>

        </div>

        <div className="p-7">

          <h3 className="font-semibold mb-4">
            Export Format
          </h3>

          <div className="grid grid-cols-3 gap-4">

            <FormatCard
              active={format === "csv"}
              onClick={() => setFormat("csv")}
              title="CSV"
              icon={<FileSpreadsheet />}
            />

            <FormatCard
              active={format === "excel"}
              onClick={() => setFormat("excel")}
              title="Excel"
              icon={<FileSpreadsheet />}
            />

            <FormatCard
              active={format === "pdf"}
              onClick={() => setFormat("pdf")}
              title="PDF"
              icon={<FileText />}
            />

            <FormatCard
              active={format === "json"}
              onClick={() => setFormat("json")}
              title="JSON"
              icon={<FileJson />}
            />

          </div>

          <div className="mt-8">

            <h3 className="font-semibold mb-4">
              Date Range
            </h3>

            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">

              <Calendar
                size={18}
                className="text-slate-500"
              />

              <select
                value={dateRange}
                onChange={(e) =>
                  setDateRange(e.target.value)
                }
                className="w-full bg-transparent py-4 outline-none"
              >
                <option value="all">All Records</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">This Year</option>
              </select>

            </div>

          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mt-8 flex gap-3">

            <CheckCircle className="text-green-400 shrink-0 mt-1" />

            <p className="text-sm text-green-300 leading-6">
              Exported reports will include filters,
              timestamps and system generated IDs.
            </p>

          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">

            <button
              onClick={onClose}
              className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={loading}
              className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? "Exporting..." : "Export"}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

function FormatCard({
  active,
  title,
  icon,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 transition ${
        active
          ? "border-blue-500 bg-blue-500/10"
          : "border-slate-800 bg-slate-950 hover:border-blue-500"
      }`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="text-blue-400">
          {icon}
        </div>

        <span className="font-semibold">
          {title}
        </span>
      </div>
    </button>
  );
}