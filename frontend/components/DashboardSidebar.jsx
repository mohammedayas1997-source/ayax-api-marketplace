import Link from "next/link";

export default function DashboardSidebar({ active = "dashboard" }) {
  const links = [
    { key: "dashboard", name: "Dashboard", href: "/dashboard" },
    { key: "wallet", name: "Wallet", href: "/dashboard/wallet" },
    { key: "api-keys", name: "API Keys", href: "/dashboard/api-keys" },
    { key: "transactions", name: "Transactions", href: "/dashboard/transactions" },
    { key: "usage", name: "Usage Stats", href: "/dashboard/usage" },
    { key: "profile", name: "Profile Settings", href: "/dashboard/profile" },
    { key: "docs", name: "API Docs", href: "/docs" },
    { key: "api-market", name: "API Plans", href: "/dashboard/api-market" },
  ];

  return (
    <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 p-6 flex-col">
      <Link href="/" className="text-2xl font-extrabold mb-10">
        Ayax <span className="text-blue-500">APIs</span>
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