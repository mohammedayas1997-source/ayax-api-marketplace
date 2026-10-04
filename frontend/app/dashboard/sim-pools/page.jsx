"use client";

import DeveloperSimPool from "@/components/DeveloperSimPool";

export default function SimPoolsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <DeveloperSimPool apiBase={process.env.NEXT_PUBLIC_API_URL || "https://ayax-api-marketplace.onrender.com/api/v1"} />
    </div>
  );
}