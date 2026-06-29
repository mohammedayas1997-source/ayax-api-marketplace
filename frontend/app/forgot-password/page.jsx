"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={60}
            height={60}
          />
        </div>

        <h1 className="text-3xl font-bold text-center">
          Forgot Password?
        </h1>

        <p className="text-slate-400 text-center mt-3">
          Enter your registered email address and we'll send you a password reset link.
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-slate-300">
              Email Address
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
              <Mail size={18} className="text-slate-500" />
              <input
                type="email"
                placeholder="name@company.com"
                className="w-full bg-transparent py-4 outline-none text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            Send Reset Link
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-blue-400 font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}