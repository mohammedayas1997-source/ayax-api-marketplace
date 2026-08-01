"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ShieldAlert,
  LockKeyhole,
} from "lucide-react";

/* ======================================================
   ROLE NORMALIZATION
====================================================== */

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
};

/* ======================================================
   GET SAVED USER
====================================================== */

const getSavedUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    return JSON.parse(savedUser);
  } catch (error) {
    console.error(
      "Unable to read saved user:",
      error
    );

    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    return null;
  }
};

/* ======================================================
   PERMISSION GUARD
====================================================== */

export default function PermissionGuard({
  allowedRoles = [],
  children,
  fallback = null,
}) {
  const [user, setUser] =
    useState(null);

  const [checking, setChecking] =
    useState(true);

  const normalizedAllowedRoles =
    useMemo(() => {
      return allowedRoles
        .map(normalizeRole)
        .filter(Boolean);
    }, [allowedRoles]);

  useEffect(() => {
    const savedUser =
      getSavedUser();

    setUser(savedUser);
    setChecking(false);
  }, []);

  /* ====================================================
     LOADING
  ==================================================== */

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="text-slate-400">
            Checking permission...
          </p>
        </div>
      </div>
    );
  }

  const currentRole =
    normalizeRole(
      user?.role
    );

  const hasPermission =
    Boolean(user) &&
    normalizedAllowedRoles.includes(
      currentRole
    );

  /* ====================================================
     ACCESS DENIED
  ==================================================== */

  if (!hasPermission) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <ShieldAlert size={34} />
          </div>

          <h1 className="text-2xl font-extrabold">
            Access Denied
          </h1>

          <p className="mt-3 leading-7 text-slate-400">
            You do not have permission
            to access this page.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
            <LockKeyhole size={18} />

            <span>
              Required roles:{" "}
              {normalizedAllowedRoles.length > 0
                ? normalizedAllowedRoles.join(", ")
                : "NONE"}
            </span>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Current role:{" "}
            {currentRole || "UNKNOWN"}
          </div>
        </div>
      </div>
    );
  }

  return children;
}