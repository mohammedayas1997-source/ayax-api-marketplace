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

import api from "@/lib/api";

const normalizeRole = (role) => {
  const value = String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    SUPERADMIN: "SUPER_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    STAFFADMIN: "STAFF_ADMIN",
    STAFF_ADMIN: "STAFF_ADMIN",
    CUSTOMERSERVICE: "CUSTOMER_SERVICE",
    CUSTOMER_SERVICE: "CUSTOMER_SERVICE",
    ADMIN: "ADMIN",
    USER: "CUSTOMER",
    DEVELOPER: "CUSTOMER",
    CUSTOMER: "CUSTOMER",
  };

  return aliases[value] || value;
};

const readStoredUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");

    return rawUser
      ? JSON.parse(rawUser)
      : null;
  } catch {
    return null;
  }
};

export default function PermissionGuard({
  allowedRoles = [],
  children,
  fallback = null,
}) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const normalizedAllowedRoles =
  useMemo(() => {
    const roles = Array.isArray(
      allowedRoles
    )
      ? allowedRoles
      : [];

    const normalizedRoles = roles
      .map(normalizeRole)
      .filter(Boolean);

    /*
     * Duk pages da ke ƙarƙashin
     * super-admin za su buƙaci
     * SUPER_ADMIN idan ba a bayar
     * da wani role ba.
     */
    return normalizedRoles.length > 0
      ? normalizedRoles
      : ["SUPER_ADMIN"];
  }, [allowedRoles]);

  useEffect(() => {
    let active = true;

    const checkPermission = async () => {
      try {
        const storedUser =
          readStoredUser();

        if (
          storedUser?.id &&
          storedUser?.role
        ) {
          setUser(storedUser);
        }

        const response =
          await api.get("/auth/me");

        const currentUser =
          response?.data?.user ||
          response?.data?.data?.user ||
          response?.data?.data ||
          null;

        if (!active) {
          return;
        }

        if (currentUser?.id) {
          const normalizedUser = {
            ...currentUser,
            role: normalizeRole(
              currentUser.role
            ),
          };

          localStorage.setItem(
            "user",
            JSON.stringify(
              normalizedUser
            )
          );

          sessionStorage.removeItem(
            "user"
          );

          setUser(
            normalizedUser
          );
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "Permission check error:",
          error?.response?.data ||
            error?.message
        );

        if (active) {
          setUser(
            readStoredUser()
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    checkPermission();

    return () => {
      active = false;
    };
  }, []);

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
    Boolean(user?.id) &&
    normalizedAllowedRoles.includes(
      currentRole
    );

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
              {normalizedAllowedRoles.join(
                ", "
              )}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Current role:{" "}
            {currentRole || "UNKNOWN"}
          </p>
        </div>
      </div>
    );
  }

  return children;
}