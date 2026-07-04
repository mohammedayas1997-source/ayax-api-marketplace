import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ClipboardList,
  Activity,
  Home,
  Wallet,
  Wifi,
  Database,
  RefreshCcw,
  Settings,
  Smartphone,
  MessageSquare,
  Radio,
  ShieldCheck,
} from "lucide-react";

export default function AdminSidebar({ active = "admin" }) {
  const links = [
    {
      key: "admin",
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      key: "users",
      name: "Users Management",
      href: "/admin/users",
      icon: Users,
    },
    {
      key: "requests",
      name: "Requests Center",
      href: "/admin/requests",
      icon: ClipboardList,
    },
    {
      key: "refunds",
      name: "Refund Requests",
      href: "/admin/refunds",
      icon: RefreshCcw,
    },
    {
      key: "pricing",
      name: "Pricing Control",
      href: "/admin/pricing",
      icon: DollarSign,
    },
    {
      key: "api-plans",
      name: "API Plans",
      href: "/admin/api-plans",
      icon: Database,
    },

    // ===== Marketplace =====

    {
      key: "marketplace",
      name: "Marketplace",
      href: "/super-admin/api-marketplace",
      icon: Wifi,
    },

    {
      key: "data-plans",
      name: "Data Plans",
      href: "/super-admin/api-marketplace/data-plans",
      icon: Wifi,
    },

    // ===== GSM GATEWAY =====

{
  key: "gsm-devices",
  name: "GSM Devices",
  href: "/super-admin/gsm/devices",
  icon: Smartphone,
},

{
  key: "gsm-sims",
  name: "SIM Manager",
  href: "/super-admin/gsm/sims",
  icon: Smartphone,
},

{
  key: "gsm-commands",
  name: "Command Queue",
  href: "/super-admin/gsm/commands",
  icon: Activity,
},

{
  key: "gsm-ussd",
  name: "USSD Logs",
  href: "/super-admin/gsm/ussd-logs",
  icon: Radio,
},

{
  key: "gsm-sms",
  name: "SMS Logs",
  href: "/super-admin/gsm/sms-logs",
  icon: MessageSquare,
},

{
  key: "gsm-analytics",
  name: "Gateway Analytics",
  href: "/super-admin/gsm/analytics",
  icon: Activity,
},

    {
      key: "providers",
      name: "API Providers",
      href: "/super-admin/api-marketplace/providers",
      icon: ShieldCheck,
    },

    {
      key: "services",
      name: "Services",
      href: "/super-admin/api-marketplace/services",
      icon: Settings,
    },

    {
      key: "analytics",
      name: "Revenue Analytics",
      href: "/admin/revenue",
      icon: Activity,
    },

    {
      key: "health",
      name: "System Health",
      href: "/admin/health",
      icon: Activity,
    },

    {
      key: "wallet",
      name: "Company Wallet",
      href: "/super-admin/wallet",
      icon: Wallet,
    },

    {
      key: "user-dashboard",
      name: "User Dashboard",
      href: "/dashboard",
      icon: Home,
    },
  ];

  return (
    <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">

      <Link href="/admin" className="mb-10">
        <h2 className="text-2xl font-extrabold">
          Ayax <span className="text-blue-500">Admin</span>
        </h2>

        <p className="text-xs text-slate-400 mt-1">
          API Marketplace Control
        </p>
      </Link>

      <nav className="space-y-2 flex-1 overflow-y-auto">

        {links.map((item) => {

          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                active === item.key
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
    </aside>
  );
}