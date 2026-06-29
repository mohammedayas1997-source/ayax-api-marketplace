"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  CreditCard,
  ArrowDownCircle,
  BookOpen,
  RefreshCcw,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import KpiGrid from "../components/KpiGrid";
import ActionButton from "../components/ActionButton";
import LoadingSkeleton from "../components/LoadingSkeleton";
import api from "@/lib/api";

export default function WalletDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const res = await api.get("/wallet/statistics");

      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Wallet Management">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Wallet Management"
      description="Manage funding, withdrawals, wallet balances and ledger."
    >
      <div className="mb-6 flex justify-end">
        <ActionButton
          icon={<RefreshCcw size={18} />}
          onClick={loadStatistics}
        >
          Refresh
        </ActionButton>
      </div>

      <KpiGrid
        items={[
          {
            title: "Wallets",
            value: stats?.totalWallets || 0,
            icon: <Wallet />,
            color: "blue",
          },
          {
            title: "Approved Funding",
            value: `₦${Number(
              stats?.totalApprovedFunding || 0
            ).toLocaleString()}`,
            icon: <CreditCard />,
            color: "green",
          },
          {
            title: "Pending Funding",
            value: stats?.pendingFunding || 0,
            icon: <ArrowDownCircle />,
            color: "yellow",
          },
          {
            title: "Pending Withdrawals",
            value: stats?.pendingWithdrawals || 0,
            icon: <BookOpen />,
            color: "red",
          },
        ]}
      />
    </DashboardLayout>
  );
}