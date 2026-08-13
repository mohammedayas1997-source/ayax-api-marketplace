"use client";

import {
  Users,
  ShieldCheck,
  Headphones,
  Wallet,
  CreditCard,
  RefreshCcw,
  Tags,
  CircuitBoard,
  Server,
  BarChart3,
  Activity,
  AlertTriangle,
} from "lucide-react";

import KpiGrid from "./KpiGrid";

export default function SuperStats() {
  const stats = [
    { title: "Total Users", value: "1,248", icon: <Users />, color: "blue" },
    { title: "Admins", value: "6", icon: <ShieldCheck />, color: "purple" },
    { title: "Support", value: "12", icon: <Headphones />, color: "green" },
    { title: "Company Wallet", value: "₦8,450,000", icon: <Wallet />, color: "blue" },
    { title: "Pending Funding", value: "18", icon: <CreditCard />, color: "yellow" },
    { title: "Pending Refunds", value: "7", icon: <RefreshCcw />, color: "red" },
    { title: "API Plans", value: "42", icon: <Tags />, color: "cyan" },
    { title: "GSM SIMs", value: "32", icon: <CircuitBoard />, color: "green" },
    { title: "API Calls", value: "842,190", icon: <Server />, color: "blue" },
    { title: "Monthly Revenue", value: "₦4,820,500", icon: <BarChart3 />, color: "green" },
    { title: "System Health", value: "99.9%", icon: <Activity />, color: "green" },
    { title: "Low SIM Balance", value: "5", icon: <AlertTriangle />, color: "red" },
  ];

  return <KpiGrid items={stats} columns={4} />;
}