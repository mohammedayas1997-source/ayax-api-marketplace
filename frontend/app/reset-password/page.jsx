"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
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
            <p className="text-sm text-slate-400">Reset Password</p>
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

        <form className="mt-8 space-y-5">
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            show={showPassword}
            setShow={setShowPassword}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            show={showConfirmPassword}
            setShow={setShowConfirmPassword}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition"
          >
            Reset Password <ArrowRight size={18} />
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-blue-400 font-semibold">
            Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function PasswordInput({ label, placeholder, show, setShow }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <Lock size={18} className="text-slate-500" />

        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />

        <button type="button" onClick={() => setShow(!show)}>
          {show ? (
            <EyeOff size={18} className="text-slate-500" />
          ) : (
            <Eye size={18} className="text-slate-500" />
          )}
        </button>
      </div>
    </div>
  );
}