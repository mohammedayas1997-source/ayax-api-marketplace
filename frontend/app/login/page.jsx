"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000/api/v1";

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;

      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      switch (user.role) {
        case "SUPER_ADMIN":
          router.push("/super-admin");
          break;

        case "ADMIN":
          router.push("/admin");
          break;

        case "STAFF_ADMIN":
          router.push("/staff-admin");
          break;

        case "CUSTOMER_SERVICE":
          router.push("/customer-service");
          break;

        default:
          router.push("/dashboard");
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
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
              Developer Login
            </p>
          </div>
        </Link>

        <h2 className="text-3xl font-extrabold text-center">
          Welcome Back
        </h2>

        <p className="text-slate-400 text-center mt-3">
          Login to manage your wallet,
          API keys and transactions.
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="text-sm text-slate-300">
              Email Address
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
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
                placeholder="admin@company.com"
                className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Password
            </label>

            <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
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
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter password"
                className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
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

            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input type="checkbox" />
                Remember Me
              </label>

              <Link
                href="/forgot-password"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              "Logging in..."
            ) : (
              <>
                Login
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-400 font-semibold"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}