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
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
  "mail.com",
];

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
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (message) {
      setMessage("");
    }
  };

  const isValidCompanyEmail = (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(normalizedEmail)) {
      return false;
    }

    const domain = normalizedEmail.split("@")[1];

    return !PERSONAL_EMAIL_DOMAINS.includes(domain);
  };

  const normalizeWebsite = (website) => {
    const value = website.trim();

    if (!value) {
      return "";
    }

    if (
      value.startsWith("http://") ||
      value.startsWith("https://")
    ) {
      return value;
    }

    return `https://${value}`;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const website = normalizeWebsite(form.website);

    if (!name) {
      setMessage("Full name is required.");
      return;
    }

    if (!isValidCompanyEmail(email)) {
      setMessage(
        "Please use a valid company or domain email address. Personal email addresses are not accepted."
      );
      return;
    }

    if (!phone) {
      setMessage("Phone number is required.");
      return;
    }

    if (form.password.length < 8) {
      setMessage(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      setMessage(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(form.password)) {
      setMessage(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(form.password)) {
      setMessage(
        "Password must contain at least one number."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name,
        email,
        phone,
        website: website || undefined,
        password: form.password,
      });

      const responseData =
        response?.data?.data || response?.data || {};

      const token =
        responseData.token ||
        responseData.accessToken;

      const user =
        responseData.user || null;

      if (token) {
        localStorage.setItem("token", token);
      }

      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify(user)
        );
      }

      if (token) {
        router.replace("/dashboard");
        return;
      }

      router.replace(
        `/login?registered=true&email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      setMessage(
        error?.userMessage ||
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
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
              Ayax{" "}
              <span className="text-blue-500">
                APIs
              </span>
            </h1>

            <p className="text-sm text-slate-400">
              Developer Marketplace
            </p>
          </div>
        </Link>

        <h2 className="text-3xl font-extrabold text-center">
          Create Account
        </h2>

        <p className="text-slate-400 text-center mt-3">
          Register and get access to the Ayax developer marketplace.
        </p>

        {message && (
          <div className="mt-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl px-4 py-3 text-sm">
            <AlertCircle
              size={18}
              className="shrink-0 mt-0.5"
            />

            <span>{message}</span>
          </div>
        )}

        <form
          onSubmit={handleRegister}
          className="mt-8 space-y-5"
        >
          <Input
            icon={<User size={18} />}
            label="Full Name"
            placeholder="Your full name"
            value={form.name}
            onChange={(value) =>
              update("name", value)
            }
            autoComplete="name"
          />

          <Input
            icon={<Mail size={18} />}
            label="Company / Domain Email Address"
            placeholder="name@yourcompany.com"
            type="email"
            value={form.email}
            onChange={(value) =>
              update("email", value)
            }
            autoComplete="email"
          />

          <Input
            icon={<Globe size={18} />}
            label="Company Website / Domain"
            placeholder="https://yourcompany.com"
            type="text"
            required={false}
            value={form.website}
            onChange={(value) =>
              update("website", value)
            }
            autoComplete="url"
          />

          <Input
            icon={<Phone size={18} />}
            label="Phone Number"
            placeholder="+2348012345678"
            type="tel"
            value={form.phone}
            onChange={(value) =>
              update("phone", value)
            }
            autoComplete="tel"
          />

          <PasswordInput
            icon={<Lock size={18} />}
            label="Password"
            placeholder="Enter password"
            value={form.password}
            onChange={(value) =>
              update("password", value)
            }
            show={showPassword}
            setShow={setShowPassword}
          />

          <PasswordInput
            icon={<Lock size={18} />}
            label="Confirm Password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(value) =>
              update("confirmPassword", value)
            }
            show={showConfirm}
            setShow={setShowConfirm}
          />

          <p className="text-xs text-slate-500">
            Password must contain at least 8 characters,
            one uppercase letter, one lowercase letter and
            one number.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              "Creating account..."
            ) : (
              <>
                Create Developer Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 font-semibold"
          >
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
  autoComplete,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 focus-within:border-blue-500">
        <span className="text-slate-500 shrink-0">
          {icon}
        </span>

        <input
          required={required}
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          autoComplete={autoComplete}
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
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 focus-within:border-blue-500">
        <span className="text-slate-500 shrink-0">
          {icon}
        </span>

        <input
          required
          minLength={8}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
        />

        <button
          type="button"
          onClick={() =>
            setShow((current) => !current)
          }
          aria-label={
            show
              ? "Hide password"
              : "Show password"
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