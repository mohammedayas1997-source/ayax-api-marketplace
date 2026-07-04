export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400",
    dark: "bg-slate-800 hover:bg-slate-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-5 py-3 rounded-xl font-semibold disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}