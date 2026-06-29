import Link from "next/link";

export default function AdminSidebar({ active = "admin" }) {
  const links = [
    { key: "admin", name: "Dashboard", href: "/admin" },
    { key: "users", name: "Users Management", href: "/admin/users" },
    { key: "pricing", name: "Pricing Control", href: "/admin/pricing" },
    { key: "revenue", name: "Revenue Analytics", href: "/admin/revenue" },
    { key: "logs", name: "API Logs", href: "/admin/logs" },
    { key: "health", name: "System Health", href: "/admin/health" },
    { key: "user-dashboard", name: "User Dashboard", href: "/dashboard" },
    { key: "requests", name: "Requests Center", href: "/admin/requests" },
    { key: "refunds", name: "Refund Requests", href: "/admin/refunds" },
    { key: "api-plans", name: "API Plans Manager", href: "/admin/api-plans" },
  ];

  return (
    <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
      <Link href="/admin" className="text-2xl font-extrabold mb-10">
        Ayax <span className="text-blue-500">Admin</span>
      </Link>

      <nav className="space-y-3 text-slate-300">
        {links.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`block px-4 py-3 rounded-xl ${
              active === item.key
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-800"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}