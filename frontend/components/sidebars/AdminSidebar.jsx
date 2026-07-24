"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  DollarSign,
  ClipboardList,
  Activity,
  Wallet,
  Wifi,
  Database,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Home,
  LogOut,
  Bell,
} from "lucide-react";

const links = [
  { section: "MAIN" },

  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },

  {
    name: "Users Management",
    href: "/admin/users",
    icon: Users,
  },

  {
    name: "Requests Center",
    href: "/admin/requests",
    icon: ClipboardList,
  },

  {
    name: "Refund Requests",
    href: "/admin/refunds",
    icon: RefreshCcw,
  },

  {
    name: "Notifications Center",
    href: "/admin/notifications",
    icon: Bell,
  },

  { section: "MARKETPLACE" },

  {
    name: "API Plans",
    href: "/admin/api-plans",
    icon: Database,
  },

  {
    name: "Pricing Control",
    href: "/admin/pricing",
    icon: DollarSign,
  },

  {
    name: "Marketplace",
    href: "/super-admin/api-marketplace",
    icon: Wifi,
  },

  {
    name: "Providers",
    href: "/super-admin/api-marketplace/providers",
    icon: ShieldCheck,
  },

  {
    name: "Services",
    href: "/super-admin/api-marketplace/services",
    icon: Settings,
  },

  { section: "BUSINESS" },

  {
    name: "Revenue Analytics",
    href: "/admin/revenue",
    icon: Activity,
  },

  {
    name: "Company Wallet",
    href: "/super-admin/wallet",
    icon: Wallet,
  },

  {
    name: "System Health",
    href: "/admin/health",
    icon: Activity,
  },

  { section: "OTHER" },

  {
    name: "User Dashboard",
    href: "/dashboard",
    icon: Home,
  },
];

export default function AdminSidebar({
  onClose,
}) {
  const pathname = usePathname();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };

  const isLinkActive = (href) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-900 p-6">
      <Link
        href="/admin"
        className="mb-8"
        onClick={onClose}
      >
        <h2 className="text-2xl font-extrabold text-white">
          Ayax{" "}
          <span className="text-blue-500">
            Admin
          </span>
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          API Marketplace Control
        </p>
      </Link>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {links.map((item, index) => {
          if (item.section) {
            return (
              <p
                key={`${item.section}-${index}`}
                className="mb-2 mt-5 px-2 text-xs uppercase tracking-wider text-slate-500"
              >
                {item.section}
              </p>
            );
          }

          const Icon = item.icon;
          const active = isLinkActive(
            item.href
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />

              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500/20"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}