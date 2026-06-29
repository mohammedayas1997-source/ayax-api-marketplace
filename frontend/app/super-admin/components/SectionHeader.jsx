"use client";

import { ChevronRight } from "lucide-react";

export default function SectionHeader({
  title,
  subtitle,
  icon,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6 ${className}`}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-white">
            {title}
          </h2>

          {subtitle && (
            <p className="text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-3">
          {action}

          <ChevronRight
            size={18}
            className="text-slate-500"
          />
        </div>
      )}
    </div>
  );
}