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
    <PermissionGuard allowedRoles={["SUPER_ADMIN"]}>
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="min-h-screen">
          <div className="fixed inset-y-0 left-0 z-40 hidden w-80 lg:block">
            <SuperSidebar />
          </div>

          <section className="min-h-screen min-w-0 lg:ml-80">
            <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
              <SuperTopbar
                title={title}
                description={description}
              />
            </div>

            <div className="min-w-0 overflow-x-hidden p-5 lg:p-10">
              {children}
            </div>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}