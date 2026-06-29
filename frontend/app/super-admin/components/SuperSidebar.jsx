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

export default function SuperSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex w-80 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
      <Link href="/super-admin" className="text-2xl font-extrabold mb-8">
        Ayax <span className="text-blue-500">Super</span>
      </Link>

      <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-3 rounded-xl"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}