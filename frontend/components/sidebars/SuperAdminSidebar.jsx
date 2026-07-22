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
  Server,
  BarChart3,
  ClipboardList,
  Activity,
  Settings,
  LockKeyhole,
  Wifi,
  Smartphone,
  Radio,
  MessageSquare,
  Database,
  LogOut,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import { Handshake } from "lucide-react";

const links = [
  { section: "MAIN" },
  { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { name: "Users", href: "/super-admin/users", icon: Users },
  { name: "Admins", href: "/super-admin/admins", icon: ShieldCheck },
  { name: "Staff", href: "/super-admin/staff", icon: Users },
  { name: "Customer Service", href: "/super-admin/customer-service", icon: Headphones },
  {
  name: "Partners",
  href: "/super-admin/partners",
  icon: Handshake,
},
  { name: "Security Alerts", href: "/super-admin/gsm/security-alerts", icon: ShieldAlert },
  { name: "Live Location", href: "/super-admin/gsm/live-location", icon: MapPin },
  
  { section: "MARKETPLACE" },
  { name: "Gateway Devices", href: "/super-admin/gateway-devices", icon: Smartphone },
  { name: "API Marketplace", href: "/super-admin/api-marketplace", icon: Database },
  { name: "Data Plans", href: "/super-admin/api-marketplace/data-plans", icon: Wifi },
  { name: "Incoming SMS", href: "/super-admin/gsm/sms-inbox", icon: MessageSquare },
  { name: "Providers", href: "/super-admin/api-marketplace/providers", icon: ShieldCheck },
  { name: "Services", href: "/super-admin/api-marketplace/services", icon: Settings },
  { name: "API Keys", href: "/super-admin/api-marketplace/api-keys", icon: LockKeyhole },
  { name: "Usage Logs", href: "/super-admin/api-marketplace/usage", icon: Activity },
  { name: "Webhooks", href: "/super-admin/api-marketplace/webhooks", icon: Server },

  { section: "WALLET" },
  { name: "Wallet", href: "/super-admin/wallet", icon: Wallet },
  { name: "Funding", href: "/super-admin/funding", icon: CreditCard },
  { name: "Refund", href: "/super-admin/refund", icon: RefreshCcw },
  { name: "Pricing", href: "/super-admin/pricing", icon: Tags },

 { section: "GSM GATEWAY" },
{ name: "Gateway Devices", href: "/super-admin/gateway-devices", icon: Smartphone },
{ name: "GSM Devices", href: "/super-admin/gsm/devices", icon: Smartphone },
{ name: "SIM Manager", href: "/super-admin/gsm/sims", icon: Smartphone },
{ name: "Command Center", href: "/super-admin/gsm/commands", icon: Activity },
{ name: "Incoming SMS", href: "/super-admin/gsm/sms-inbox", icon: MessageSquare },
{ name: "USSD Logs", href: "/super-admin/gsm/ussd-logs", icon: Radio },
{ name: "SMS Logs", href: "/super-admin/gsm/sms-logs", icon: MessageSquare },
{ name: "Gateway Analytics", href: "/super-admin/gsm/analytics", icon: BarChart3 },

  { section: "SYSTEM" },
  { name: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { name: "Audit Logs", href: "/super-admin/audit", icon: ClipboardList },
  { name: "API Monitor", href: "/super-admin/api", icon: Server },
  { name: "System Health", href: "/super-admin/system-health", icon: Activity },
  { name: "Security", href: "/super-admin/security", icon: LockKeyhole },
  { name: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default function SuperAdminSidebar({ onClose }) {
  const pathname = usePathname();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="h-screen w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
      <Link href="/super-admin" className="mb-8" onClick={onClose}>
        <h2 className="text-2xl font-extrabold text-white">
          Ayax <span className="text-blue-500">Super</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Enterprise Control Center
        </p>
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