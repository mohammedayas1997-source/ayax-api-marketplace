"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccess("");
    setError("");

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/auth/forgot-password",
        {
          email,
        }
      );

      setSuccess(
        res.data.message ||
          "Password reset link has been sent."
      );

      setEmail("");
    } catch (err) {
      setError(
        err.userMessage ||
          err.response?.data?.message ||
          "Unable to send reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8">

        <div className="mb-8 flex justify-center">
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={60}
            height={60}
            priority
          />
        </div>

        <h1 className="text-center text-3xl font-bold">
          Forgot Password
        </h1>

        <p className="mt-3 text-center text-slate-400">
          Enter your registered email address and we'll send you a password reset link.
        </p>

        {success && (
          <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="text-sm text-slate-300">
              Email Address
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
              <Mail
                size={18}
                className="text-slate-500"
              />

              <input
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="name@company.com"
                className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              "Sending..."
            ) : (
              <>
                Send Reset Link
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="font-semibold text-blue-400"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}