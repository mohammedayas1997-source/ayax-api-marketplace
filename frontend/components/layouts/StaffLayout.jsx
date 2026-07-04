"use client";

import { useState } from "react";
import { Menu, X, Bell, User, CircuitBoard } from "lucide-react";
import StaffSidebar from "@/components/sidebars/StaffSidebar";

export default function StaffLayout({ children, title, description }) {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <div className="hidden lg:block fixed left-0 top-0">
          <StaffSidebar />
        </div>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
            <div className="relative w-72 max-w-[90%]">
              <button onClick={() => setOpen(false)} className="absolute right-4 top-4 z-10 text-slate-400">
                <X size={22} />
              </button>
              <StaffSidebar onClose={() => setOpen(false)} />
            </div>
          </div>
        )}

        <section className="flex-1 lg:ml-72 min-h-screen">
          <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-5 lg:px-10 py-4">
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => setOpen(true)} className="lg:hidden bg-slate-900 border border-slate-800 p-3 rounded-xl">
                <Menu size={22} />
              </button>

              <div className="flex-1">
                {title && <h1 className="text-xl lg:text-2xl font-extrabold">{title}</h1>}
                {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
              </div>

              <div className="flex items-center gap-3">
                <button className="hidden md:flex bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl items-center gap-2 text-slate-300">
                  <CircuitBoard size={18} />
                  Staff
                </button>
                <button className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-slate-300">
                  <Bell size={18} />
                </button>
                <button className="bg-blue-600 p-3 rounded-xl text-white">
                  <User size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="p-5 lg:p-10">{children}</div>
        </section>
      </div>
    </main>
  );
}