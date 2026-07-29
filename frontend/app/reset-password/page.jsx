"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "Reset token is missing or invalid. Please request a new password reset link."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });

      setSuccess(
        response.data?.message ||
          "Password reset successfully. Redirecting to login..."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.userMessage ||
          "Unable to reset password. The link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <Link
          href="/"
          className="flex items-center justify-center gap-3 mb-8"
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
              Ayax <span className="text-blue-500">APIs</span>
            </h1>

            <p className="text-sm text-slate-400">
              Reset Password
            </p>
          </div>
        </Link>

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center">
          Create New Password
        </h2>

        <p className="text-slate-400 text-center mt-3">
          Enter your new password and confirm it to secure your account.
        </p>

        {!token && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <p className="text-sm">
              Reset token is missing. Please use the link sent to your
              email address.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

            <p className="text-sm">{success}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            show={showPassword}
            setShow={setShowPassword}
            autoComplete="new-password"
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            show={showConfirmPassword}
            setShow={setShowConfirmPassword}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading || !token || success}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              "Resetting Password..."
            ) : (
              <>
                Reset Password
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-blue-400 font-semibold"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
  show,
  setShow,
  autoComplete,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 focus-within:border-blue-500">
        <Lock size={18} className="text-slate-500 shrink-0" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          minLength={8}
          autoComplete={autoComplete}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />

        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          aria-label={
            show ? "Hide password" : "Show password"
          }
          className="text-slate-500 hover:text-white"
        >
          {show ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
}