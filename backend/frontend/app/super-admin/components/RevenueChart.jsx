"use client";

import { BarChart3, TrendingUp } from "lucide-react";

const data = [
  { label: "Mon", revenue: 185000 },
  { label: "Tue", revenue: 240000 },
  { label: "Wed", revenue: 198000 },
  { label: "Thu", revenue: 310000 },
  { label: "Fri", revenue: 420000 },
  { label: "Sat", revenue: 290000 },
  { label: "Sun", revenue: 350000 },
];

const formatNaira = (amount) =>
  `₦${Number(amount).toLocaleString("en-US")}`;

export default function RevenueChart() {
  const max = Math.max(...data.map((item) => item.revenue));

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <BarChart3 />
            <span className="font-semibold">Revenue Analytics</span>
          </div>

          <h2 className="text-xl font-bold">Weekly Revenue</h2>
        </div>

        <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <TrendingUp size={16} />
          +32%
        </div>
      </div>

      <div className="space-y-5">
        {data.map((item) => {
          const width = `${(item.revenue / max) * 100}%`;

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">{item.label}</span>
                <span className="font-bold">{formatNaira(item.revenue)}</span>
              </div>

              <div className="h-4 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}