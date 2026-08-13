"use client";

import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export default function Toast({
  message,
  type = "success",
  onClose,
}) {
  if (!message) return null;

  const styles = {
    success: "bg-green-500/10 border-green-500/30 text-green-300",
    error: "bg-red-500/10 border-red-500/30 text-red-300",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[999] w-full max-w-sm border rounded-2xl p-4 shadow-2xl ${styles[type]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>

        <p className="flex-1 text-sm leading-6">
          {message}
        </p>

        {onClose && (
          <button onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}