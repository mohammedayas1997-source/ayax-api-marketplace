"use client";

import SuperAdminMasterPool from "@/components/SuperAdminMasterPool";

export default function MasterPoolPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <SuperAdminMasterPool apiBase={process.env.NEXT_PUBLIC_API_URL || "https://ayax-api-marketplace.onrender.com/api/v1"} />
    </div>
  );
}