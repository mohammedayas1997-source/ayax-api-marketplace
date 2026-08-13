import { X } from "lucide-react";

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{title}</h2>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}