"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Bell,
  ShieldCheck,
  LockKeyhole,
  Save,
  RefreshCcw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  transactionNotifications: true,
  walletNotifications: true,
  securityNotifications: true,
  marketingNotifications: false,
  twoFactorEnabled: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get("/settings");

      const serverSettings =
        response.data?.settings ||
        response.data?.data?.settings ||
        response.data?.data ||
        null;

      if (serverSettings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...serverSettings,
        });

        return serverSettings;
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        throw error;
      }
    }

    const storedSettings =
      localStorage.getItem("ayax_user_settings");

    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }

    return DEFAULT_SETTINGS;
  }, []);

  const loadSettings = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        await fetchSettings();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load account settings."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchSettings]
  );

  useEffect(() => {
    loadSettings();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleSettingsUpdated = () => {
      fetchSettings().catch(console.error);
    };

    socket.on("settings-updated", handleSettingsUpdated);

    return () => {
      socket.off(
        "settings-updated",
        handleSettingsUpdated
      );
    };
  }, [loadSettings, fetchSettings]);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      setMessage("");

      let response = null;

      try {
        response = await api.patch(
          "/settings",
          settings
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        localStorage.setItem(
          "ayax_user_settings",
          JSON.stringify(settings)
        );
      }

      setMessageType("success");
      setMessage(
        response?.data?.message ||
          "Settings saved successfully."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to save settings."
        )
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (!currentPassword) {
      setMessageType("error");
      setMessage("Current password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setMessageType("error");
      setMessage(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage(
        "New password and confirmation do not match."
      );
      return;
    }

    if (newPassword === currentPassword) {
      setMessageType("error");
      setMessage(
        "New password must be different from the current password."
      );
      return;
    }

    try {
      setChangingPassword(true);
      setMessage("");

      let response;

      try {
        response = await api.patch(
          "/auth/change-password",
          {
            currentPassword,
            newPassword,
          }
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        response = await api.patch(
          "/users/change-password",
          {
            currentPassword,
            newPassword,
          }
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Password changed successfully."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to change password."
        )
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage notifications, account security and password."
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
            loadSettings({ silent: true })
          }
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={
              refreshing ? "animate-spin" : ""
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
            Loading settings...
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <Bell size={23} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Notification Preferences
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Select the alerts you want to receive.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              <ToggleRow
                title="Email Notifications"
                description="Receive important account notifications by email."
                checked={settings.emailNotifications}
                onChange={(value) =>
                  updateSetting(
                    "emailNotifications",
                    value
                  )
                }
              />

              <ToggleRow
                title="Transaction Notifications"
                description="Receive alerts for successful, processing and failed transactions."
                checked={
                  settings.transactionNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "transactionNotifications",
                    value
                  )
                }
              />

              <ToggleRow
                title="Wallet Notifications"
                description="Receive alerts for funding, deductions and low balance."
                checked={
                  settings.walletNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "walletNotifications",
                    value
                  )
                }
              />

              <ToggleRow
                title="Security Notifications"
                description="Receive alerts for login and security activity."
                checked={
                  settings.securityNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "securityNotifications",
                    value
                  )
                }
              />

              <ToggleRow
                title="Marketing Notifications"
                description="Receive Ayax product announcements and offers."
                checked={
                  settings.marketingNotifications
                }
                onChange={(value) =>
                  updateSetting(
                    "marketingNotifications",
                    value
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={savingSettings}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:px-8"
            >
              {savingSettings ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Preferences
                </>
              )}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
                <ShieldCheck size={23} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Account Security
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Configure additional account protection.
                </p>
              </div>
            </div>

            <ToggleRow
              title="Two-Factor Authentication"
              description="Require an additional verification code when signing in."
              checked={settings.twoFactorEnabled}
              onChange={(value) =>
                updateSetting(
                  "twoFactorEnabled",
                  value
                )
              }
            />

            <p className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-300">
              Two-factor authentication will become fully active
              when the backend verification route is connected.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <LockKeyhole size={23} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Change Password
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Use a strong password that you do not use elsewhere.
                </p>
              </div>
            </div>

            <form
              onSubmit={changePassword}
              className="space-y-5"
            >
              <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                visible={showCurrentPassword}
                onToggle={() =>
                  setShowCurrentPassword(
                    (current) => !current
                  )
                }
              />

              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggle={() =>
                  setShowNewPassword(
                    (current) => !current
                  )
                }
              />

              <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
              />

              <button
                type="submit"
                disabled={changingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {changingPassword ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <LockKeyhole size={18} />
                    Change Password
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

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-5 first:pt-0 last:pb-0">
      <div>
        <h3 className="font-semibold text-slate-100">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked
            ? "bg-blue-600"
            : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
}) {
  return (
    <div>
      <label className="text-sm text-slate-300">
        {label}
      </label>

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 focus-within:border-blue-500">
        <Settings
          size={18}
          className="text-slate-500"
        />

        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          required
          className="w-full bg-transparent py-4 text-white outline-none"
        />

        <button
          type="button"
          onClick={onToggle}
          className="text-slate-500 hover:text-slate-300"
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
}