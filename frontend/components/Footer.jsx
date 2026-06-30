import Link from "next/link";

const groups = [
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Partners", href: "/partners" },
      { name: "Careers", href: "/careers" },
      { name: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Developers",
    links: [
      { name: "Docs", href: "/docs" },
      { name: "Pricing", href: "/pricing" },
      { name: "API Status", href: "/status" },
      { name: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Refund Policy", href: "/refund-policy" },
      { name: "Cookie Policy", href: "/cookies" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "FAQ", href: "/faq" },
      { name: "Security", href: "/security" },
      { name: "Contact Support", href: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-1">
          <h2 className="text-2xl font-extrabold">
            Ayax <span className="text-blue-500">APIs</span>
          </h2>
          <p className="text-slate-400 mt-4 leading-7">
            Secure API marketplace for developers and businesses.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="font-bold mb-4">{group.title}</h3>

            <div className="space-y-3">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-slate-400 hover:text-blue-400 text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
        © 2026 Ayax Digital Solutions. All rights reserved.
      </div>
    </footer>
  );
}