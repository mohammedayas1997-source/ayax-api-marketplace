"use client";

import { useState } from "react";
import { CalendarDays, Filter, RefreshCcw } from "lucide-react";

export default function DateRangePicker({
  onChange,
  defaultRange = "30days",
}) {
  const [range, setRange] = useState(defaultRange);
  const [custom, setCustom] = useState({
    startDate: "",
    endDate: "",
  });

  const applyRange = (value) => {
    setRange(value);

    if (onChange) {
      onChange({
        range: value,
        startDate: custom.startDate,
        endDate: custom.endDate,
      });
    }
  };

  const applyCustom = () => {
    setRange("custom");

    if (onChange) {
      onChange({
        range: "custom",
        startDate: custom.startDate,
        endDate: custom.endDate,
      });
    }
  };

  const reset = () => {
    setRange(defaultRange);
    setCustom({
      startDate: "",
      endDate: "",
    });

    if (onChange) {
      onChange({
        range: defaultRange,
        startDate: "",
        endDate: "",
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
      <div className="flex items-center gap-3 mb-5">
        <CalendarDays className="text-blue-400" />
        <h3 className="font-bold">Date Range</h3>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3">
        <select
          value={range}
          onChange={(e) => applyRange(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
          <option value="custom">Custom</option>
        </select>

        <input
          type="date"
          value={custom.startDate}
          onChange={(e) =>
            setCustom({
              ...custom,
              startDate: e.target.value,
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={custom.endDate}
          onChange={(e) =>
            setCustom({
              ...custom,
              endDate: e.target.value,
            })
          }
          className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
        />

        <button
          onClick={applyCustom}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
        >
          <Filter size={18} />
          Apply
        </button>

        <button
          onClick={reset}
          className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} />
          Reset
        </button>
      </div>
    </div>
  );
}