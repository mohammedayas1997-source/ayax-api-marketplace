"use client";

import { useState } from "react";
import {
  LockKeyhole,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const sessions = [
  {
    id: "SES-1001",
    device: "Chrome on Windows",
    ip: "192.168.43.19",
    location: "Nigeria",
    status: "Active",
    lastSeen: "Now",
  },
  {
    id: "SES-1002",
    device: "Android Mobile",
    ip: "192.168.1.55",
    location: "Nigeria",
    status: "Expired",
    lastSeen: "Yesterday",
  },
];

const securityEvents = [
  {
    id: "SEC-1001",
    title: "Successful Login",
    desc: "Super Admin logged in successfully",
    status: "Success",
    time: "Today 09:15 AM",
  },
  {
    id: "SEC-1002",
    title: "Invalid PIN Attempt",
    desc: "Wrong PIN entered while approving refund",
    status: "Warning",
    time: "Today 01:40 PM",
  },
  {
    id: "SEC-1003",
    title: "Password Changed",
    desc: "Super Admin password was updated",
    status: "Success",
    time: "Yesterday 05:30 PM",
  },
];

export default function SuperSecurityPage() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pinForm, setPinForm] = useState({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  });

  const updatePassword = () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      setMessage("Please fill password fields.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    setPasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setMessage("Password updated successfully.");
  };

  const updatePin = () => {
    if (!pinForm.oldPin || !pinForm.newPin) {
      setMessage("Please fill PIN fields.");
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      setMessage("New PINs do not match.");
      return;
    }

    setPinForm({
      oldPin: "",
      newPin: "",
      confirmPin: "",
    });

    setMessage("Transaction PIN updated successfully.");
  };

  const revokeSession = (id) => {
    setMessage(`Session ${id} revoked successfully.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Security Center" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="2FA Status" value="Enabled" icon={<ShieldCheck />} />
            <Stat title="Active Sessions" value="1" icon={<Monitor />} />
            <Stat title="PIN Attempts" value="4" icon={<KeyRound />} />
            <Stat title="Security Alerts" value="1" icon={<AlertTriangle />} />
          </section>

          <section className="grid xl:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <LockKeyhole className="text-blue-400" />
                <h2 className="text-xl font-bold">Change Password</h2>
              </div>

              <div className="space-y-4">
                <PasswordInput
                  label="Old Password"
                  value={passwordForm.oldPassword}
                  show={showOldPassword}
                  setShow={setShowOldPassword}
                  onChange={(v) =>
                    setPasswordForm({
                      ...passwordForm,
                      oldPassword: v,
                    })
                  }
                />

                <PasswordInput
                  label="New Password"
                  value={passwordForm.newPassword}
                  show={showNewPassword}
                  setShow={setShowNewPassword}
                  onChange={(v) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: v,
                    })
                  }
                />

                <Input
                  type="password"
                  label="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(v) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: v,
                    })
                  }
                />

                <button
                  onClick={updatePassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Update Password
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <KeyRound className="text-blue-400" />
                <h2 className="text-xl font-bold">Change Transaction PIN</h2>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-2xl p-4 mb-5">
                <p className="text-sm">
                  This PIN is required for refund, funding, pricing and wallet actions.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  label="Old PIN"
                  value={pinForm.oldPin}
                  onChange={(v) => setPinForm({ ...pinForm, oldPin: v })}
                />

                <Input
                  type="password"
                  label="New PIN"
                  value={pinForm.newPin}
                  onChange={(v) => setPinForm({ ...pinForm, newPin: v })}
                />

                <Input
                  type="password"
                  label="Confirm New PIN"
                  value={pinForm.confirmPin}
                  onChange={(v) =>
                    setPinForm({
                      ...pinForm,
                      confirmPin: v,
                    })
                  }
                />

                <button
                  onClick={updatePin}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Update PIN
                </button>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <Monitor className="text-blue-400" />
                <h2 className="text-xl font-bold">Device Sessions</h2>
              </div>

              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                          {session.device.includes("Android") ? (
                            <Smartphone />
                          ) : (
                            <Monitor />
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold">{session.device}</h3>
                          <p className="text-sm text-slate-500">
                            {session.ip} • {session.location}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Last seen: {session.lastSeen}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            session.status === "Active"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {session.status}
                        </span>

                        <button
                          onClick={() => revokeSession(session.id)}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-3 rounded-xl"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <RefreshCcw className="text-blue-400" />
                <h2 className="text-xl font-bold">Security Events</h2>
              </div>

              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 ${
                          event.status === "Success"
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {event.status === "Success" ? (
                          <CheckCircle size={18} />
                        ) : (
                          <AlertTriangle size={18} />
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold">{event.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {event.desc}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                          {event.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      />
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, setShow }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>

      <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-3 outline-none"
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