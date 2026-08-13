"use client";

import { useState } from "react";
import {
  X,
  LockKeyhole,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

export default function ConfirmPinModal({
  open,
  onClose,
  onConfirm,
  title = "Confirm Transaction PIN",
  description = "Enter your Super Admin PIN to continue.",
}) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    if (pin.length < 4) {
      alert("PIN must be at least 4 digits.");
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
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">

        <div className="bg-blue-600 p-6">
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <ShieldCheck />

              <div>
                <h2 className="font-bold text-xl">
                  {title}
                </h2>

                <p className="text-blue-100 text-sm mt-1">
                  Secure Authorization
                </p>
              </div>
            </div>

            <button onClick={onClose}>
              <X />
            </button>

          </div>
        </div>

        <div className="p-7">

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex gap-3 mb-6">

            <AlertTriangle className="text-yellow-400 shrink-0 mt-1" />

            <p className="text-sm text-yellow-200 leading-6">
              {description}
            </p>

          </div>

          <label className="text-slate-400 text-sm">
            Super Admin PIN
          </label>

          <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">

            <LockKeyhole
              size={18}
              className="text-slate-500"
            />

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
                <EyeOff
                  size={18}
                  className="text-slate-500"
                />
              ) : (
                <Eye
                  size={18}
                  className="text-slate-500"
                />
              )}
            </button>

          </div>

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
              className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Confirm"}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}