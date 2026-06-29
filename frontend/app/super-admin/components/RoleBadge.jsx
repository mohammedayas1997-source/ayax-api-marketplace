"use client";

export default function RoleBadge({ role }) {
  const styles = {
    SUPER_ADMIN: "bg-blue-500/10 text-blue-400",
    ADMIN: "bg-purple-500/10 text-purple-400",
    STAFF_ADMIN: "bg-cyan-500/10 text-cyan-400",
    CUSTOMER_SERVICE: "bg-green-500/10 text-green-400",
    CUSTOMER: "bg-slate-700 text-slate-300",
  };

  return (
    <span
      className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${
        styles[role] || "bg-slate-700 text-slate-300"
      }`}
    >
      {role || "UNKNOWN"}
    </span>
  );
}