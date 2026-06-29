"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
      <Link
        href="/super-admin"
        className="flex items-center gap-2 hover:text-blue-400"
      >
        <Home size={16} />
        Super Admin
      </Link>

      {items.map((item, index) => (
        <div key={item.href || item.label} className="flex items-center gap-2">
          <ChevronRight size={15} />

          {index === items.length - 1 || !item.href ? (
            <span className="text-slate-300 font-semibold">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-blue-400">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}