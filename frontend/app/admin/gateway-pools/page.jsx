"use client";

import AdminMarketplaceSimPool from "@/components/AdminMarketplaceSimPool";

export default function AdminGatewayPoolsPage() {
  return (
    <div className="min-h-screen bg-slate-100/70 py-8">
      <AdminMarketplaceSimPool apiBase={process.env.NEXT_PUBLIC_API_URL || "https://ayax-api-marketplace.onrender.com/api/v1"} />
    </div>
  );
}