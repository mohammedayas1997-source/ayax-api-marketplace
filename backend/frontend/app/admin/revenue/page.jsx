import {
  Wallet,
  TrendingUp,
  BarChart3,
  Download,
  Wifi,
  Smartphone,
  SearchCheck,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

const stats = [
  { title: "Total Revenue", value: "₦4,820,500", icon: <Wallet /> },
  { title: "Today Revenue", value: "₦185,400", icon: <TrendingUp /> },
  { title: "This Month", value: "₦1,240,900", icon: <BarChart3 /> },
  { title: "API Charges", value: "₦786,200", icon: <Wallet /> },
];

const services = [
  {
    name: "Data API",
    revenue: "₦2,850,000",
    calls: "570,000",
    icon: <Wifi />,
    width: "w-[90%]",
  },
  {
    name: "Airtime API",
    revenue: "₦1,420,500",
    calls: "473,500",
    icon: <Smartphone />,
    width: "w-[70%]",
  },
  {
    name: "Transaction Status API",
    revenue: "₦550,000",
    calls: "550,000",
    icon: <SearchCheck />,
    width: "w-[45%]",
  },
];

export default function AdminRevenuePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="revenue" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">
            <div>
              <div className="flex items-center gap-3 text-blue-400 mb-3">
                <BarChart3 />
                <span className="font-semibold">
                  Revenue Monitoring
                </span>
              </div>

              <h1 className="text-3xl font-extrabold">
                Revenue Analytics
              </h1>

              <p className="text-slate-400 mt-2">
                Track API revenue, wallet deductions and service performance.
              </p>
            </div>

            <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <Download size={18} />
              Export Report
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((item) => (
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
            <h2 className="text-xl font-bold mb-6">
              Revenue by Service
            </h2>

            <div className="space-y-6">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                        {service.icon}
                      </div>

                      <div>
                        <h3 className="font-bold">
                          {service.name}
                        </h3>

                        <p className="text-slate-500 text-sm">
                          {service.calls} API calls
                        </p>
                      </div>
                    </div>

                    <h3 className="text-2xl font-extrabold">
                      {service.revenue}
                    </h3>
                  </div>

                  <div className="mt-5 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-600 rounded-full ${service.width}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}