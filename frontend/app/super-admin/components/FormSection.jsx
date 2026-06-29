"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function FormSection({
  title,
  description,
  children,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-800 transition"
      >
        <div className="text-left">
          <h3 className="text-xl font-bold">{title}</h3>

          {description && (
            <p className="text-sm text-slate-500 mt-2">
              {description}
            </p>
          )}
        </div>

        {open ? (
          <ChevronUp className="text-slate-500" />
        ) : (
          <ChevronDown className="text-slate-500" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-800 p-6">
          {children}
        </div>
      )}
    </section>
  );
}