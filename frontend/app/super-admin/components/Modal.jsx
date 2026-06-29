"use client";

import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title = "Modal",
  children,
  footer,
  size = "md",
}) {
  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">
      <div
        className={`w-full ${sizes[size]} bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">{children}</div>

        {footer && (
          <div className="p-6 border-t border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}