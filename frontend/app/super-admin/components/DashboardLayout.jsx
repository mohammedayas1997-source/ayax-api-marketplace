"use client";

import SuperSidebar from "./SuperSidebar";
import SuperTopbar from "./SuperTopbar";
import PermissionGuard from "./PermissionGuard";

export default function DashboardLayout({
  children,
  title = "Super Admin Dashboard",
  description,
}) {
  return (
    <PermissionGuard
      allowedRoles={["SUPER_ADMIN"]}
    >
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex">
          <SuperSidebar />

          <section className="min-w-0 flex-1 p-6 lg:p-10">
            <SuperTopbar
              title={title}
              description={description}
            />

            {children}
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}