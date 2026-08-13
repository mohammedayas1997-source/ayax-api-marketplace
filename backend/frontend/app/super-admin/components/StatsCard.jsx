"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
} from "lucide-react";

export default function StatsCard({
  title,
  value,
  icon,
  color = "blue",
  change,
  changeType = "up",
  subtitle,
  onClick,
}) {
  const colors = {
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "hover:border-blue-500",
    },
    green: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "hover:border-green-500",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "hover:border-red-500",
    },
    yellow: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-400",
      border: "hover:border-yellow-500",
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "hover:border-purple-500",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "hover:border-cyan-500",
    },
  };

  const theme = colors[color] || colors.blue;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-slate-900 border border-slate-800 ${theme.border} rounded-3xl p-6 transition duration-300`}
    >
      <div className="flex items-start justify-between">

        <div>

          <div
            className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center mb-5`}
          >
            {icon}
          </div>

          <p className="text-slate-400 text-sm">
            {title}
          </p>

          <h2 className="text-3xl font-extrabold mt-2">
            {value}
          </h2>

          {subtitle && (
            <p className="text-xs text-slate-500 mt-3">
              {subtitle}
            </p>
          )}

        </div>

        {onClick && (
          <ArrowUpRight
            className="text-slate-500"
            size={18}
          />
        )}

      </div>

      {change && (
        <div className="flex items-center gap-2 mt-5">

          {changeType === "up" && (
            <TrendingUp
              size={16}
              className="text-green-400"
            />
          )}

          {changeType === "down" && (
            <TrendingDown
              size={16}
              className="text-red-400"
            />
          )}

          {changeType === "flat" && (
            <Minus
              size={16}
              className="text-slate-400"
            />
          )}

          <span
            className={`text-sm font-semibold ${
              changeType === "up"
                ? "text-green-400"
                : changeType === "down"
                ? "text-red-400"
                : "text-slate-400"
            }`}
          >
            {change}
          </span>

        </div>
      )}
    </button>
  );
}