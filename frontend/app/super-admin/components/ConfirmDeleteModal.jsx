"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  description = "This action is permanent and cannot be undone.",
  requirePin = true,
}) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (requirePin && pin.length < 4) {
      alert("Enter Super Admin PIN.");
      return;
    }

    try {
      setLoading(true);
      await onConfirm(pin);
      setPin("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="bg-red-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trash2 />

            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-red-100 text-sm mt-1">
                Destructive Action
              </p>
            </div>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-7">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3 mb-6">
            <AlertTriangle className="text-red-400 shrink-0 mt-1" />

            <p className="text-sm text-red-200 leading-6">
              {description}
            </p>
          </div>

          {requirePin && (
            <>
              <label className="text-slate-400 text-sm">
                Super Admin PIN
              </label>

              <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <LockKeyhole size={18} className="text-slate-500" />

                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  type={showPin ? "text" : "password"}
                  placeholder="******"
                  className="w-full bg-transparent py-4 outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? (
                    <EyeOff size={18} className="text-slate-500" />
                  ) : (
                    <Eye size={18} className="text-slate-500" />
                  )}
                </button>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={onClose}
              className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="py-4 rounded-2xl bg-red-600 hover:bg-red-700 font-semibold disabled:opacity-60"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}