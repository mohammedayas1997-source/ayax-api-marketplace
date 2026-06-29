"use client";

import { X, Save } from "lucide-react";

export default function FormModal({
  open,
  onClose,
  title = "Form",
  children,
  onSubmit,
  submitText = "Save",
  loading = false,
  width = "max-w-2xl",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">
      <div
        className={`w-full ${width} bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold">{title}</h2>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-semibold"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={onSubmit}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />

            {loading ? "Saving..." : submitText}
          </button>
        </div>
      </div>
    </div>
  );
}