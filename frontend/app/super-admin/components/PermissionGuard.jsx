"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, LockKeyhole } from "lucide-react";

export default function PermissionGuard({
  allowedRoles = [],
  children,
  fallback = null,
}) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="text-slate-400">Checking permission...</p>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) return fallback;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={34} />
          </div>

          <h1 className="text-2xl font-extrabold">Access Denied</h1>

          <p className="text-slate-400 mt-3 leading-7">
            You do not have permission to access this page.
          </p>

          <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-center gap-3 text-slate-400">
            <LockKeyhole size={18} />
            Required roles: {allowedRoles.join(", ")}
          </div>
        </div>
      </div>
    );
  }

  return children;
}