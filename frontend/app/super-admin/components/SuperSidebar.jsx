"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Headphones,
  Wallet,
  CreditCard,
  RefreshCcw,
  Tags,
  CircuitBoard,
  Server,
  BarChart3,
  Settings,
  LockKeyhole,
  ClipboardList,
  Activity,
  LogOut,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { name: "Users", href: "/super-admin/users", icon: Users },
  { name: "Admins", href: "/super-admin/admins", icon: ShieldCheck },
  { name: "Staff", href: "/super-admin/staff", icon: Users },
  { name: "Customer Service", href: "/super-admin/customer-service", icon: Headphones },

  { name: "Wallet", href: "/super-admin/wallet", icon: Wallet },
  { name: "Funding", href: "/super-admin/funding", icon: CreditCard },
  { name: "Refund", href: "/super-admin/refund", icon: RefreshCcw },
  { name: "Pricing", href: "/super-admin/pricing", icon: Tags },

  { name: "GSM Gateway", href: "/super-admin/gsm-gateway", icon: CircuitBoard },

  { name: "API Monitor", href: "/super-admin/api", icon: Server },
  { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { name: "Audit Logs", href: "/super-admin/audit", icon: ClipboardList },
  { name: "System Health", href: "/super-admin/system-health", icon: Activity },
  { name: "Security", href: "/super-admin/security", icon: LockKeyhole },
  { name: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default function SuperSidebar({ onClose }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/super-admin") {
      return pathname === "/super-admin";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-6">
        <Link
          href="/super-admin"
          onClick={onClose}
          className="block"
        >
          <h1 className="text-2xl font-extrabold text-white">
            Ayax{" "}
            <span className="text-blue-500">
              Super
            </span>
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Enterprise Control Center
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-red-400 transition hover:bg-red-500/20"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}