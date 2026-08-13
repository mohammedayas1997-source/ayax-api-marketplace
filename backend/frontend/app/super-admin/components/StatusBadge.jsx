"use client";

import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  PauseCircle,
  Loader2,
} from "lucide-react";

export default function StatusBadge({
  status,
  size = "sm",
}) {
  const styles = {
    SUCCESS: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      icon: <CheckCircle size={size === "sm" ? 14 : 18} />,
    },

    ACTIVE: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      icon: <CheckCircle size={size === "sm" ? 14 : 18} />,
    },

    APPROVED: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      icon: <CheckCircle size={size === "sm" ? 14 : 18} />,
    },

    PROCESSING: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      icon: <Loader2 size={size === "sm" ? 14 : 18} className="animate-spin" />,
    },

    PENDING: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      icon: <Clock size={size === "sm" ? 14 : 18} />,
    },

    WARNING: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      icon: <AlertTriangle size={size === "sm" ? 14 : 18} />,
    },

    SUSPENDED: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      icon: <PauseCircle size={size === "sm" ? 14 : 18} />,
    },

    FAILED: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      icon: <XCircle size={size === "sm" ? 14 : 18} />,
    },

    REJECTED: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      icon: <XCircle size={size === "sm" ? 14 : 18} />,
    },

    DISABLED: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      icon: <XCircle size={size === "sm" ? 14 : 18} />,
    },
  };

  const config =
    styles[status?.toUpperCase()] || {
      bg: "bg-slate-700",
      text: "text-slate-300",
      icon: <Clock size={size === "sm" ? 14 : 18} />,
    };

  return (
    <span
      className={`${config.bg} ${config.text} inline-flex items-center gap-2 px-3 py-1 rounded-full ${
        size === "lg" ? "text-sm py-2 px-4" : "text-xs"
      } font-semibold`}
    >
      {config.icon}
      {status}
    </span>
  );
}