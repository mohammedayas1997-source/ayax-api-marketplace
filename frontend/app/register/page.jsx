"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "CUSTOMER",
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      router.push("/dashboard");
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <Image src="/assets/logo.png" alt="Ayax Logo" width={50} height={50} />
          <div>
            <h1 className="text-2xl font-bold">
              Ayax <span className="text-blue-500">APIs</span>
            </h1>
            <p className="text-sm text-slate-400">Developer Marketplace</p>
          </div>
        </Link>

        <h2 className="text-3xl font-extrabold text-center">Create Account</h2>

        <p className="text-slate-400 text-center mt-3">
          Register and get your developer API key.
        </p>

        {message && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <Input
            icon={<User size={18} />}
            label="Full Name"
            placeholder="Your full name"
            value={form.name}
            onChange={(v) => update("name", v)}
          />

          <Input
            icon={<Mail size={18} />}
            label="Company / Domain Email Address"
            placeholder="name@yourcompany.com"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
          />

          <Input
            icon={<Globe size={18} />}
            label="Company Website / Domain"
            placeholder="https://yourcompany.com"
            type="url"
            required={false}
            value={form.website}
            onChange={(v) => update("website", v)}
          />

          <Input
            icon={<Phone size={18} />}
            label="Phone Number"
            placeholder="08012345678"
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
          />

          <PasswordInput
            icon={<Lock size={18} />}
            label="Password"
            placeholder="Enter password"
            value={form.password}
            onChange={(v) => update("password", v)}
            show={showPassword}
            setShow={setShowPassword}
          />

          <PasswordInput
            icon={<Lock size={18} />}
            label="Confirm Password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(v) => update("confirmPassword", v)}
            show={showConfirm}
            setShow={setShowConfirm}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            {loading ? "Creating account..." : "Create Developer Account"}
            {!loading && <ArrowRight size={18} />}
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

function Input({
  icon,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required = true,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <span className="text-slate-500">{icon}</span>
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

function PasswordInput({
  icon,
  label,
  placeholder,
  value,
  onChange,
  show,
  setShow,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <span className="text-slate-500">{icon}</span>
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />
        <button type="button" onClick={() => setShow(!show)}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}