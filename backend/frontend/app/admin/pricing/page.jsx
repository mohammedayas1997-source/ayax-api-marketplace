"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  Wifi,
  Smartphone,
  SearchCheck,
  PlusCircle,
  Search,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

export default function AdminPricingPage() {
  const [services] = useState([
    {
      id: 1,
      name: "Data API",
      endpoint: "/api/v1/data/buy",
      price: "5",
      enabled: true,
      icon: <Wifi />,
    },
    {
      id: 2,
      name: "Airtime API",
      endpoint: "/api/v1/airtime/buy",
      price: "3",
      enabled: true,
      icon: <Smartphone />,
    },
    {
      id: 3,
      name: "Transaction Status API",
      endpoint: "/api/v1/transaction/status",
      price: "1",
      enabled: true,
      icon: <SearchCheck />,
    },
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="pricing" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10">
            <div>
              <div className="flex items-center gap-3 text-blue-400 mb-3">
                <Settings />
                <span className="font-semibold">
                  Service Pricing Management
                </span>
              </div>

              <h1 className="text-3xl font-extrabold">
                Pricing Control
              </h1>

              <p className="text-slate-400 mt-2">
                Configure pricing for all API services.
              </p>
            </div>

            <button className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2">
              <PlusCircle size={18} />
              Add New Service
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 flex items-center gap-3 mb-8">
            <Search size={18} className="text-slate-500" />

            <input
              placeholder="Search service..."
              className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-5">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="grid lg:grid-cols-[1fr_200px_160px_140px] gap-5 items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                      {service.icon}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        {service.name}
                      </h2>

                      <p className="text-slate-500 text-sm font-mono">
                        {service.endpoint}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">
                      Price Per Request
                    </label>

                    <div className="mt-2 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4">
                      <span className="text-slate-400">₦</span>

                      <input
                        defaultValue={service.price}
                        className="w-full bg-transparent py-3 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">
                      Status
                    </label>

                    <div className="mt-2">
                      <span
                        className={`px-3 py-2 rounded-full text-xs ${
                          service.enabled
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {service.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <button className="bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}