import {
  Activity,
  BarChart3,
  Wifi,
  Smartphone,
  SearchCheck,
  TrendingUp,
} from "lucide-react";

import DashboardSidebar from "@/components/DashboardSidebar";

const usageStats = [
  {
    title: "Total API Calls",
    value: "18,240",
    icon: <Activity />,
  },
  {
    title: "Data API Calls",
    value: "12,400",
    icon: <Wifi />,
  },
  {
    title: "Airtime API Calls",
    value: "4,920",
    icon: <Smartphone />,
  },
  {
    title: "Status Checks",
    value: "920",
    icon: <SearchCheck />,
  },
];

const services = [
  {
    name: "Data API",
    calls: "12,400",
    revenue: "₦62,000",
    success: "98.7%",
  },
  {
    name: "Airtime API",
    calls: "4,920",
    revenue: "₦14,760",
    success: "97.2%",
  },
  {
    name: "Transaction Status",
    calls: "920",
    revenue: "₦920",
    success: "99.1%",
  },
];

export default function UsagePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <DashboardSidebar active="usage" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold">
              Usage Statistics
            </h1>

            <p className="text-slate-400 mt-2">
              Monitor API calls, success rate, revenue and service performance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {usageStats.map((item) => (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="text-blue-400 mb-5">
                  {item.icon}
                </div>

                <p className="text-slate-400">
                  {item.title}
                </p>

                <h2 className="text-3xl font-extrabold mt-2">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <section className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-blue-400" />
              <h2 className="text-xl font-bold">
                API Performance
              </h2>
            </div>

            <div className="space-y-5">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-bold">
                        {service.name}
                      </h3>

                      <p className="text-slate-500 text-sm">
                        {service.calls} total calls
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm">
                        Revenue: {service.revenue}
                      </span>

                      <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm">
                        Success: {service.success}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-[85%]" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 bg-gradient-to-br from-blue-600 to-slate-900 rounded-3xl p-8 border border-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp />
              <h2 className="text-2xl font-bold">
                Monthly Growth
              </h2>
            </div>

            <p className="text-blue-100 leading-8">
              Your API usage increased by 32% this month. Keep monitoring failed
              transactions and optimize your API integration for better
              performance.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}