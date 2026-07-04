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
} from "lucide-react";

const links = [
  { section: "MAIN" },
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users Management", href: "/admin/users", icon: Users },
  { name: "Requests Center", href: "/admin/requests", icon: ClipboardList },
  { name: "Refund Requests", href: "/admin/refunds", icon: RefreshCcw },

  { section: "MARKETPLACE" },
  { name: "API Plans", href: "/admin/api-plans", icon: Database },
  { name: "Pricing Control", href: "/admin/pricing", icon: DollarSign },
  { name: "Marketplace", href: "/super-admin/api-marketplace", icon: Wifi },
  { name: "Providers", href: "/super-admin/api-marketplace/providers", icon: ShieldCheck },
  { name: "Services", href: "/super-admin/api-marketplace/services", icon: Settings },

  { section: "BUSINESS" },
  { name: "Revenue Analytics", href: "/admin/revenue", icon: Activity },
  { name: "Company Wallet", href: "/super-admin/wallet", icon: Wallet },
  { name: "System Health", href: "/admin/health", icon: Activity },

  { section: "OTHER" },
  { name: "User Dashboard", href: "/dashboard", icon: Home },
];

export default function AdminSidebar({ onClose }) {
  const pathname = usePathname();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="h-screen w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
      <Link href="/admin" className="mb-8" onClick={onClose}>
        <h2 className="text-2xl font-extrabold text-white">
          Ayax <span className="text-blue-500">Admin</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">API Marketplace Control</p>
      </Link>

      <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
        {links.map((item, index) => {
          if (item.section) {
            return (
              <p
                key={index}
                className="text-xs text-slate-500 uppercase tracking-wider mt-5 mb-2 px-2"
              >
                {item.section}
              </p>
            );
          }

          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
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
        onClick={logout}
        className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500/20"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}