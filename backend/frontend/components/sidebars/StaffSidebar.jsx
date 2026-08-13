"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CircuitBoard,
  Smartphone,
  Activity,
  Radio,
  MessageSquare,
  AlertTriangle,
  Wallet,
  LogOut,
} from "lucide-react";

const links = [
  { section: "STAFF" },
  { name: "Dashboard", href: "/staff-admin/gsm-gateway", icon: LayoutDashboard },
  { name: "GSM Gateway", href: "/staff-admin/gsm-gateway", icon: CircuitBoard },
  { name: "SIM Manager", href: "/staff-admin/gsm-gateway/sims", icon: Smartphone },
  { name: "Command Queue", href: "/staff-admin/gsm-gateway/commands", icon: Activity },
  { name: "USSD Logs", href: "/staff-admin/gsm-gateway/ussd-logs", icon: Radio },
  { name: "SMS Logs", href: "/staff-admin/gsm-gateway/sms-logs", icon: MessageSquare },
  { name: "Low Balance Alerts", href: "/staff-admin/gsm-gateway/alerts", icon: AlertTriangle },
  { name: "Company Wallet", href: "/staff-admin/gsm-gateway/wallet", icon: Wallet },
];

export default function StaffSidebar({ onClose }) {
  const pathname = usePathname();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="h-screen w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
      <Link href="/staff-admin/gsm-gateway" className="mb-8" onClick={onClose}>
        <h2 className="text-2xl font-extrabold text-white">
          Ayax <span className="text-blue-500">Staff</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">GSM Gateway Control</p>
      </Link>

      <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
        {links.map((item, index) => {
          if (item.section) {
            return (
              <p key={index} className="text-xs text-slate-500 uppercase tracking-wider mt-5 mb-2 px-2">
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
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500/20">
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}