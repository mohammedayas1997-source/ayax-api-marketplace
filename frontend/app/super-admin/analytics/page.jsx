"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Wallet,
  Activity,
  Wifi,
  Smartphone,
  SearchCheck,
  Download,
  CalendarDays,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const analyticsData = [
  { day: "Mon", revenue: 185000, apiCalls: 12400, users: 32 },
  { day: "Tue", revenue: 240000, apiCalls: 15200, users: 41 },
  { day: "Wed", revenue: 198000, apiCalls: 14100, users: 28 },
  { day: "Thu", revenue: 310000, apiCalls: 18450, users: 55 },
  { day: "Fri", revenue: 420000, apiCalls: 22100, users: 73 },
  { day: "Sat", revenue: 290000, apiCalls: 17600, users: 44 },
  { day: "Sun", revenue: 350000, apiCalls: 19600, users: 61 },
];

const serviceStats = [
  {
    name: "Data API",
    calls: 62400,
    revenue: 2850000,
    success: "98.7%",
    icon: Wifi,
  },
  {
    name: "Airtime API",
    calls: 42100,
    revenue: 1420500,
    success: "97.2%",
    icon: Smartphone,
  },
  {
    name: "Transaction Status",
    calls: 18500,
    revenue: 550000,
    success: "99.1%",
    icon: SearchCheck,
  },
];

const topCustomers = [
  {
    company: "Tech Hub Ltd",
    spend: 580000,
    calls: 24800,
    status: "Active",
  },
  {
    company: "JohnSoft",
    spend: 320000,
    calls: 12400,
    status: "Active",
  },
  {
    company: "API Reseller NG",
    spend: 250000,
    calls: 9200,
    status: "Active",
  },
];

export default function SuperAnalyticsPage() {
  const [period, setPeriod] = useState("7 Days");

  const totals = useMemo(() => {
    return {
      revenue: analyticsData.reduce((sum, item) => sum + item.revenue, 0),
      apiCalls: analyticsData.reduce((sum, item) => sum + item.apiCalls, 0),
      users: analyticsData.reduce((sum, item) => sum + item.users, 0),
    };
  }, []);

  const maxRevenue = Math.max(...analyticsData.map((item) => item.revenue));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Analytics Center" />

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-3 text-blue-400 mb-2">
                  <CalendarDays />
                  <span className="font-semibold">Analytics Period</span>
                </div>

                <h2 className="text-2xl font-bold">
                  Business Performance Overview
                </h2>

                <p className="text-slate-400 mt-2">
                  Track revenue, API calls, users, service performance and customer growth.
                </p>
              </div>

              <div className="flex gap-3">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
                >
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>1 Year</option>
                </select>

                <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2">
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>
          </section>

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Revenue" value={formatNaira(totals.revenue)} icon={<Wallet />} />
            <Stat title="API Calls" value={totals.apiCalls.toLocaleString("en-US")} icon={<Activity />} />
            <Stat title="New Users" value={totals.users} icon={<Users />} />
            <Stat title="Growth Rate" value="+32%" icon={<TrendingUp />} />
          </section>

          <section className="grid xl:grid-cols-[1.2fr_0.8fr] gap-8 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-blue-400" />
                <h2 className="text-xl font-bold">Revenue Chart</h2>
              </div>

              <div className="space-y-5">
                {analyticsData.map((item) => {
                  const width = `${(item.revenue / maxRevenue) * 100}%`;

                  return (
                    <div key={item.day}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">{item.day}</span>
                        <span className="font-bold">
                          {formatNaira(item.revenue)}
                        </span>
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
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-5">
                <TrendingUp size={32} />
                <h2 className="text-2xl font-bold">Monthly Growth</h2>
              </div>

              <h3 className="text-5xl font-extrabold">+32%</h3>

              <p className="text-blue-100 mt-4 leading-7">
                Revenue and API usage increased this period. Data API and Airtime API remain the strongest revenue channels.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-blue-100 text-sm">Success Rate</p>
                  <h4 className="text-2xl font-bold mt-1">98.7%</h4>
                </div>

                <div className="bg-white/10 rounded-2xl p-4">
                  <p className="text-blue-100 text-sm">Profit Margin</p>
                  <h4 className="text-2xl font-bold mt-1">18%</h4>
                </div>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1fr_1fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-6">Service Performance</h2>

              <div className="space-y-5">
                {serviceStats.map((service) => {
                  const Icon = service.icon;

                  return (
                    <div
                      key={service.name}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                            <Icon size={22} />
                          </div>

                          <div>
                            <h3 className="font-bold">{service.name}</h3>
                            <p className="text-sm text-slate-500">
                              {service.calls.toLocaleString("en-US")} API calls
                            </p>
                          </div>
                        </div>

                        <h3 className="text-xl font-extrabold">
                          {formatNaira(service.revenue)}
                        </h3>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-slate-500 text-sm">
                          Success Rate
                        </span>

                        <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                          {service.success}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-6">Top Customers</h2>

              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div
                    key={customer.company}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold">
                          #{index + 1} {customer.company}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {customer.calls.toLocaleString("en-US")} API calls
                        </p>
                      </div>

                      <div className="text-right">
                        <h3 className="font-extrabold">
                          {formatNaira(customer.spend)}
                        </h3>

                        <span className="inline-flex mt-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                          {customer.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}