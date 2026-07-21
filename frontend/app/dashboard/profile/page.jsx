"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import {
  User,
  Mail,
  Phone,
  Globe,
  Building2,
  Save,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  BadgeCheck,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const initialForm = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  website: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [originalProfile, setOriginalProfile] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("info");

  const fetchProfile = useCallback(async () => {
    const response = await api.get("/auth/me");

    const user =
      response.data?.user ||
      response.data?.data?.user ||
      response.data?.data ||
      null;

    if (!user) {
      throw new Error(
        "Profile information was not found."
      );
    }

    const profile = {
      name:
        user.name ||
        user.fullName ||
        "",
      companyName:
        user.companyName ||
        user.businessName ||
        user.company ||
        "",
      email: user.email || "",
      phone:
        user.phone ||
        user.phoneNumber ||
        "",
      website:
        user.website ||
        user.companyWebsite ||
        "",
    };

    setForm(profile);
    setOriginalProfile(user);

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    return user;
  }, []);

  const loadProfile = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        await fetchProfile();
      } catch (error) {
        const storedUser =
          typeof window !== "undefined"
            ? localStorage.getItem("user")
            : null;

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);

            setOriginalProfile(user);

            setForm({
              name:
                user.name ||
                user.fullName ||
                "",
              companyName:
                user.companyName ||
                user.businessName ||
                user.company ||
                "",
              email: user.email || "",
              phone:
                user.phone ||
                user.phoneNumber ||
                "",
              website:
                user.website ||
                user.companyWebsite ||
                "",
            });
          } catch {
            // Ignore invalid stored data.
          }
        }

        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load profile information."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    loadProfile();

    const token =
      localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleProfileUpdated = () => {
      fetchProfile().catch(console.error);
    };

    socket.on(
      "profile-updated",
      handleProfileUpdated
    );

    return () => {
      socket.off(
        "profile-updated",
        handleProfileUpdated
      );
    };
  }, [loadProfile, fetchProfile]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const companyName =
      form.companyName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const website = form.website.trim();

    if (!name) {
      setMessageType("error");
      setMessage("Full name is required.");
      return;
    }

    if (!email) {
      setMessageType("error");
      setMessage("Email address is required.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid email address."
      );
      return;
    }

    if (
      phone &&
      !/^\+?[0-9\s()-]{7,20}$/.test(phone)
    ) {
      setMessageType("error");
      setMessage(
        "Enter a valid phone number."
      );
      return;
    }

    if (website) {
      try {
        new URL(website);
      } catch {
        setMessageType("error");
        setMessage(
          "Company website must start with http:// or https://."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        name,
        companyName,
        email,
        phone,
        website,
      };

      let response;

      try {
        response = await api.patch(
          "/auth/profile",
          payload
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        response = await api.patch(
          "/users/profile",
          payload
        );
      }

      const updatedUser =
        response.data?.user ||
        response.data?.data?.user ||
        response.data?.data ||
        {
          ...originalProfile,
          ...payload,
        };

      setOriginalProfile(updatedUser);

      setForm({
        name:
          updatedUser.name ||
          updatedUser.fullName ||
          name,
        companyName:
          updatedUser.companyName ||
          updatedUser.businessName ||
          companyName,
        email: updatedUser.email || email,
        phone:
          updatedUser.phone ||
          updatedUser.phoneNumber ||
          phone,
        website:
          updatedUser.website ||
          updatedUser.companyWebsite ||
          website,
      });

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Profile updated successfully."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to update profile."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    form.companyName ||
    form.name ||
    "Developer Account";

  const verificationStatus = String(
    originalProfile?.verificationStatus ||
      originalProfile?.status ||
      "ACTIVE"
  ).toUpperCase();

  return (
    <DashboardLayout
      title="Profile Settings"
      description="Manage your developer account and business profile."
    >
      {message && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : messageType === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{message}</span>
        </div>
      )}

      <div className="mb-8 flex justify-end">
        <button
          type="button"
          onClick={() =>
            loadProfile({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading profile...
          </div>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="h-fit rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Image
                  src="/assets/logo.png"
                  alt="Ayax Logo"
                  width={100}
                  height={100}
                  className="rounded-3xl border border-slate-700 bg-white object-contain p-2"
                />

                <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-slate-900 bg-blue-600">
                  <BadgeCheck size={18} />
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold">
                {displayName}
              </h2>

              <p className="mt-2 text-slate-400">
                {form.email ||
                  "Developer API Marketplace Account"}
              </p>

              <span
                className={`mt-5 rounded-full px-4 py-2 text-sm ${
                  [
                    "VERIFIED",
                    "ACTIVE",
                    "APPROVED",
                  ].includes(
                    verificationStatus
                  )
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {verificationStatus}
              </span>

              <div className="mt-8 w-full space-y-3 text-left">
                <ProfileInfo
                  label="Account Role"
                  value={
                    originalProfile?.role ||
                    "USER"
                  }
                />

                <ProfileInfo
                  label="Member Since"
                  value={
                    originalProfile?.createdAt
                      ? new Date(
                          originalProfile.createdAt
                        ).toLocaleDateString()
                      : "-"
                  }
                />

                <ProfileInfo
                  label="Account ID"
                  value={
                    originalProfile?.id || "-"
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-6 text-xl font-bold">
              Account Information
            </h2>

            <form
              onSubmit={saveProfile}
              className="space-y-5"
            >
              <Input
                icon={<User size={18} />}
                label="Full Name"
                value={form.name}
                onChange={(value) =>
                  updateField("name", value)
                }
                placeholder="Enter your full name"
                required
              />

              <Input
                icon={<Building2 size={18} />}
                label="Company Name"
                value={form.companyName}
                onChange={(value) =>
                  updateField(
                    "companyName",
                    value
                  )
                }
                placeholder="Enter company name"
              />

              <Input
                icon={<Mail size={18} />}
                label="Company Email"
                value={form.email}
                onChange={(value) =>
                  updateField("email", value)
                }
                placeholder="admin@company.com"
                type="email"
                required
              />

              <Input
                icon={<Phone size={18} />}
                label="Phone Number"
                value={form.phone}
                onChange={(value) =>
                  updateField("phone", value)
                }
                placeholder="+234 800 000 0000"
                type="tel"
              />

              <Input
                icon={<Globe size={18} />}
                label="Company Website"
                value={form.website}
                onChange={(value) =>
                  updateField(
                    "website",
                    value
                  )
                }
                placeholder="https://example.com"
                type="url"
              />

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

function Input({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
        <span className="text-slate-500">
          {icon}
        </span>

        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

function ProfileInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}