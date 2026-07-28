"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(
        "Email and password are required."
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      /*
       * api.js already contains:
       * https://ayax-api-marketplace.onrender.com/api/v1
       *
       * Saboda haka endpoint kawai ake turawa.
       */
      const response = await api.post(
        "/auth/login",
        {
          email: normalizedEmail,
          password,
        }
      );

      const token =
        response.data?.token;

      const user =
        response.data?.user;

      if (!token || !user?.id) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      localStorage.setItem(
        "token",
        token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      const requestedRedirect =
        searchParams.get("redirect");

      if (
        requestedRedirect &&
        requestedRedirect.startsWith("/") &&
        !requestedRedirect.startsWith("//")
      ) {
        router.replace(
          requestedRedirect
        );

        return;
      }

      const userRole = String(
        user.role || "CUSTOMER"
      ).toUpperCase();

      switch (userRole) {
        case "SUPER_ADMIN":
          router.replace(
            "/super-admin"
          );
          break;

        case "ADMIN":
          router.replace("/admin");
          break;

        case "STAFF_ADMIN":
          router.replace(
            "/staff-admin"
          );
          break;

        case "CUSTOMER_SERVICE":
          router.replace(
            "/customer-service"
          );
          break;

        default:
          router.replace(
            "/dashboard"
          );
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Login page error:",
        {
          status:
            error?.response?.status,

          code:
            error?.response?.data
              ?.code,

          response:
            error?.response?.data,

          message:
            error?.message,
        }
      );

      setErrorMessage(
        error?.userMessage ||
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to complete login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={50}
            height={50}
            priority
          />

          <div>
            <h1 className="text-2xl font-bold">
              Ayax{" "}
              <span className="text-blue-500">
                APIs
              </span>
            </h1>

            <p className="text-sm text-slate-400">
              Developer Login
            </p>
          </div>
        </Link>

        <h2 className="text-center text-3xl font-extrabold">
          Welcome Back
        </h2>

        <p className="mt-3 text-center text-slate-400">
          Login to manage your wallet,
          API keys and transactions.
        </p>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-300">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="text-sm text-slate-300">
              Email Address
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
              <Mail
                size={18}
                className="text-slate-500"
              />

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="admin@company.com"
                className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Password
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
              <Lock
                size={18}
                className="text-slate-500"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter password"
                className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                className="rounded-lg p-1"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
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

            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  className="accent-blue-600"
                />
                Remember Me
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              "Logging in..."
            ) : (
              <>
                Login
                <ArrowRight
                  size={18}
                />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400">
            Don&apos;t have an
            account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-400"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}