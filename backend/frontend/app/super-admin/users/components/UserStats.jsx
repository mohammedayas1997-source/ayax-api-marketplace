"use client";

import { Users, UserCheck, ShieldCheck, UserX } from "lucide-react";
import KpiGrid from "../../components/KpiGrid";

export default function UserStats({ stats = {} }) {
  const items = [
    {
      title: "Total Users",
      value: stats.totalUsers || stats.total || 0,
      icon: <Users />,
      color: "blue",
    },
    {
      title: "Active Users",
      value: stats.activeUsers || stats.active || 0,
      icon: <UserCheck />,
      color: "green",
    },
    {
      title: "Admins",
      value: stats.admins || 0,
      icon: <ShieldCheck />,
      color: "purple",
    },
    {
      title: "Suspended",
      value: stats.suspendedUsers || stats.suspended || 0,
      icon: <UserX />,
      color: "red",
    },
  ];

  return <KpiGrid items={items} />;
}