"use client";

import { Loader2 } from "lucide-react";

export default function ActionButton({
  children,
  icon,
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
}) {
  const variants = {
    primary:
      "bg-blue-600 hover:bg-blue-700 text-white",

    secondary:
      "bg-slate-800 hover:bg-slate-700 text-white",

    success:
      "bg-green-600 hover:bg-green-700 text-white",

    danger:
      "bg-red-600 hover:bg-red-700 text-white",

    warning:
      "bg-yellow-500 hover:bg-yellow-600 text-black",

    outline:
      "border border-slate-700 hover:border-blue-500 bg-transparent text-white",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm rounded-xl",
    md: "px-5 py-3 text-sm rounded-2xl",
    lg: "px-6 py-4 text-base rounded-2xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        font-semibold
        transition
        flex
        items-center
        justify-center
        gap-2
        disabled:opacity-50
        disabled:cursor-not-allowed
      `}
    >
      {loading ? (
        <>
          <Loader2
            size={18}
            className="animate-spin"
          />
          Loading...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}