"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState("EMAIL");
  
  // Form States
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Mataki 1: Neman OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Email address is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email: cleanEmail });
      
      setSuccess(res.data?.message || "Verification code sent to your email.");
      setStep("RESET");
    } catch (err) {
      setError(err.response?.data?.message || err.userMessage || "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Mataki 2: Tabbatar da OTP da Saita Sabon Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccess(res.data?.message || "Password reset successful! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || err.userMessage || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <Image src="/assets/logo.png" alt="Ayax Logo" width={56} height={56} priority />
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight">
          {step === "EMAIL" ? "Forgot Password" : "Reset Your Password"}
        </h1>

        <p className="mt-2 text-center text-sm text-slate-400">
          {step === "EMAIL"
            ? "Enter your registered email to receive a 6-digit reset code."
            : `Enter the 6-digit code sent to ${email} and your new password.`}
        </p>

        {success && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3.5 text-sm text-green-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === "EMAIL" ? (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500 transition">
                <Mail size={18} className="text-slate-500 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-transparent py-3.5 text-sm outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  Get Reset Code
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                6-Digit OTP Code
              </label>
              <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500 transition">
                <KeyRound size={18} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  disabled={loading}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-transparent py-3.5 text-sm outline-none text-white placeholder:text-slate-600 tracking-widest font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                New Password
              </label>
              <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500 transition">
                <Lock size={18} className="text-slate-500 shrink-0" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  disabled={loading}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3.5 text-sm outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500 transition">
                <Lock size={18} className="text-slate-500 shrink-0" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  disabled={loading}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3.5 text-sm outline-none text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Save New Password"
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep("EMAIL")}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition mt-2"
            >
              Change email address
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs font-medium text-blue-400 hover:underline transition">
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}