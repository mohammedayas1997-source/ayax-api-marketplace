"use client";

import React from "react";
import DeveloperSimPool from "@/components/DeveloperSimPool";

// Wannan yana hana Vercel/Next.js faduwa wajen prerendering:
export const dynamic = "force-dynamic";

export default function SimPoolsPage() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ayax-api-marketplace.onrender.com/api/v1";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <DeveloperSimPool apiBase={apiBase} />
    </div>
  );
}