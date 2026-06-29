"use client";

import Link from "next/link";
import Image from "next/image";
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Globe,
} from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/assets/logo.png"
            alt="Ayax Logo"
            width={50}
            height={50}
          />
          <div>
            <h1 className="text-2xl font-bold">
              Ayax <span className="text-blue-500">APIs</span>
            </h1>
            <p className="text-sm text-slate-400">Developer Marketplace</p>
          </div>
        </Link>

        <h2 className="text-3xl font-extrabold text-center">
          Create Account
        </h2>

        <p className="text-slate-400 text-center mt-3">
          Register and get your developer API key.
        </p>

        <form className="mt-8 space-y-5">
          <Input
            icon={<User size={18} />}
            label="Full Name"
            placeholder="Your full name"
          />

          <Input
            icon={<Mail size={18} />}
            label="Company / Domain Email Address"
            placeholder="name@yourcompany.com"
            type="email"
          />

          <Input
            icon={<Globe size={18} />}
            label="Company Website / Domain"
            placeholder="https://yourcompany.com"
            type="url"
          />

          <Input
            icon={<Phone size={18} />}
            label="Phone Number"
            placeholder="08012345678"
            type="tel"
          />

          <Input
            icon={<Lock size={18} />}
            label="Password"
            placeholder="Enter password"
            type="password"
          />

          <Input
            icon={<Lock size={18} />}
            label="Confirm Password"
            placeholder="Confirm password"
            type="password"
          />

          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            Create Developer Account <ArrowRight size={18} />
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function Input({ icon, label, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <span className="text-slate-500">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}