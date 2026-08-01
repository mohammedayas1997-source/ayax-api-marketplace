"use client";

import SuperSidebar from "./SuperSidebar";
import SuperTopbar from "./SuperTopbar";

export default function DashboardLayout({
  children,
  title = "Super Admin Dashboard",
  description,
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar
            title={title}
            description={description}
          />

          {children}
        </section>
      </div>
    </main>
  );
}