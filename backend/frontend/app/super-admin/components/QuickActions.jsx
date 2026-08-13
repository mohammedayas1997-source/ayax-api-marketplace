"use client";

import Link from "next/link";
import {
  Users,
  CreditCard,
  RefreshCcw,
  Tags,
  CircuitBoard,
  ClipboardList,
  ShieldCheck,
  Settings,
} from "lucide-react";

const actions = [
  {
    title: "Manage Users",
    desc: "View, suspend, activate and assign roles.",
    href: "/super-admin/users",
    icon: Users,
  },
  {
    title: "Funding Requests",
    desc: "Approve or reject wallet funding.",
    href: "/super-admin/funding",
    icon: CreditCard,
  },
  {
    title: "Refund Center",
    desc: "Review refund requests with PIN approval.",
    href: "/super-admin/refund",
    icon: RefreshCcw,
  },
  {
    title: "API Pricing",
    desc: "Create and push customer API plans.",
    href: "/super-admin/pricing",
    icon: Tags,
  },
  {
    title: "GSM Gateway",
    desc: "Monitor and recharge 32 SIM gateway.",
    href: "/super-admin/gsm-gateway",
    icon: CircuitBoard,
  },
  {
    title: "Audit Logs",
    desc: "Track every sensitive system action.",
    href: "/super-admin/audit",
    icon: ClipboardList,
  },
  {
    title: "Security",
    desc: "Manage PIN, password and sessions.",
    href: "/super-admin/security",
    icon: ShieldCheck,
  },
  {
    title: "Settings",
    desc: "Configure company and system settings.",
    href: "/super-admin/settings",
    icon: Settings,
  },
];

export default function QuickActions() {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h2 className="text-xl font-bold mb-6">Quick Actions</h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-2xl p-5 transition"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <Icon size={22} />
              </div>

              <h3 className="font-bold">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-6">
                {item.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}