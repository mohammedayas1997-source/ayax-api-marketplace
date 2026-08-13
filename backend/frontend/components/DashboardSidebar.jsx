"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  KeyRound,
  Receipt,
  Activity,
  User,
  BookOpen,
  Wifi,
  Smartphone,
  Tv,
  Lightbulb,
  ShieldCheck,
  CreditCard,
  Bell,
  Settings,
  Home,
  LogOut,
} from "lucide-react";

const links = [
  { section: "MAIN" },
  { key: "dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "wallet", name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { key: "transactions", name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { key: "usage", name: "Usage Analytics", href: "/dashboard/usage", icon: Activity },

  { section: "MARKETPLACE" },
  { key: "data", name: "Data Plans", href: "/dashboard/api-market/data", icon: Wifi },
  { key: "airtime", name: "Airtime", href: "/dashboard/api-market/airtime", icon: Smartphone },
  { key: "electricity", name: "Electricity", href: "/dashboard/api-market/electricity", icon: Lightbulb },
  { key: "cable", name: "Cable TV", href: "/dashboard/api-market/cable", icon: Tv },
  { key: "bvn", name: "BVN Verification", href: "/dashboard/api-market/bvn", icon: ShieldCheck },
  { key: "nin", name: "NIN Verification", href: "/dashboard/api-market/nin", icon: CreditCard },

  { section: "DEVELOPER" },
  { key: "api-keys", name: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
  { key: "docs", name: "API Docs", href: "/docs", icon: BookOpen },

  { section: "ACCOUNT" },
  { key: "notifications", name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { key: "profile", name: "Profile", href: "/dashboard/profile", icon: User },
  { key: "settings", name: "Settings", href: "/dashboard/settings", icon: Settings },
  { key: "home", name: "Home", href: "/", icon: Home },
];

export default function DashboardSidebar({ onClose }) {
  const pathname = usePathname();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="h-screen w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
      <Link href="/" className="mb-8" onClick={onClose}>
        <h2 className="text-2xl font-extrabold text-white">
          Ayax <span className="text-blue-500">APIs</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">Developer Marketplace</p>
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
              key={item.key}
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