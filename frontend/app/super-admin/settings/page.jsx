"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  CreditCard,
  Mail,
  MessageCircle,
  KeyRound,
  Save,
  ShieldCheck,
  Database,
  Server,
  Bell,
  Wrench,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

export default function SuperSettingsPage() {
  const [message, setMessage] = useState("");

  const [company, setCompany] = useState({
    name: "Ayax Digital Solutions",
    email: "info@ayaxdigital.solutions",
    phone: "+2348161444444",
    website: "https://ayaxdigital.solutions",
  });

  const [bank, setBank] = useState({
    bankName: "Moniepoint MFB",
    accountName: "Ayax Digital Solutions",
    accountNumber: "1234567890",
  });

  const [gateway, setGateway] = useState({
    paystack: "",
    monnify: "",
    flutterwave: "",
  });

  const [smtp, setSmtp] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
  });

  const [system, setSystem] = useState({
    maintenance: false,
    emailNotification: true,
    smsNotification: true,
    socketNotification: true,
  });

  const saveSettings = () => {
    setMessage("Settings saved successfully. Backend integration will persist this later.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="System Settings" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Company Profile" value="Active" icon={<Building2 />} />
            <Stat title="Payment Gateway" value="Ready" icon={<CreditCard />} />
            <Stat title="Notifications" value="Enabled" icon={<Bell />} />
            <Stat title="System Mode" value={system.maintenance ? "Maintenance" : "Live"} icon={<Server />} />
          </section>

          <section className="grid xl:grid-cols-2 gap-8">
            <Panel title="Company Profile" icon={<Building2 />}>
              <Input label="Company Name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
              <Input label="Email" value={company.email} onChange={(v) => setCompany({ ...company, email: v })} />
              <Input label="Phone" value={company.phone} onChange={(v) => setCompany({ ...company, phone: v })} />
              <Input label="Website" value={company.website} onChange={(v) => setCompany({ ...company, website: v })} />
            </Panel>

            <Panel title="Bank Account" icon={<CreditCard />}>
              <Input label="Bank Name" value={bank.bankName} onChange={(v) => setBank({ ...bank, bankName: v })} />
              <Input label="Account Name" value={bank.accountName} onChange={(v) => setBank({ ...bank, accountName: v })} />
              <Input label="Account Number" value={bank.accountNumber} onChange={(v) => setBank({ ...bank, accountNumber: v })} />
            </Panel>

            <Panel title="Payment Gateway Keys" icon={<KeyRound />}>
              <Input label="Paystack Secret Key" value={gateway.paystack} onChange={(v) => setGateway({ ...gateway, paystack: v })} type="password" />
              <Input label="Monnify API Key" value={gateway.monnify} onChange={(v) => setGateway({ ...gateway, monnify: v })} type="password" />
              <Input label="Flutterwave Secret Key" value={gateway.flutterwave} onChange={(v) => setGateway({ ...gateway, flutterwave: v })} type="password" />
              <p className="text-xs text-yellow-400">
                In production, these keys should be stored in backend .env only.
              </p>
            </Panel>

            <Panel title="SMTP Email Settings" icon={<Mail />}>
              <Input label="SMTP Host" value={smtp.host} onChange={(v) => setSmtp({ ...smtp, host: v })} />
              <Input label="SMTP Port" value={smtp.port} onChange={(v) => setSmtp({ ...smtp, port: v })} />
              <Input label="SMTP Username" value={smtp.username} onChange={(v) => setSmtp({ ...smtp, username: v })} />
              <Input label="SMTP Password" value={smtp.password} onChange={(v) => setSmtp({ ...smtp, password: v })} type="password" />
            </Panel>

            <Panel title="Notification Settings" icon={<MessageCircle />}>
              <Toggle
                label="Email Notifications"
                checked={system.emailNotification}
                onChange={() =>
                  setSystem({
                    ...system,
                    emailNotification: !system.emailNotification,
                  })
                }
              />

              <Toggle
                label="SMS Notifications"
                checked={system.smsNotification}
                onChange={() =>
                  setSystem({
                    ...system,
                    smsNotification: !system.smsNotification,
                  })
                }
              />

              <Toggle
                label="Socket.IO Live Notifications"
                checked={system.socketNotification}
                onChange={() =>
                  setSystem({
                    ...system,
                    socketNotification: !system.socketNotification,
                  })
                }
              />
            </Panel>

            <Panel title="System Control" icon={<Wrench />}>
              <Toggle
                label="Maintenance Mode"
                checked={system.maintenance}
                onChange={() =>
                  setSystem({
                    ...system,
                    maintenance: !system.maintenance,
                  })
                }
              />

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="text-blue-400" />
                  <h3 className="font-bold">Backup Status</h3>
                </div>

                <p className="text-slate-500 text-sm">
                  Last backup: Today 03:00 AM
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="text-blue-400" />
                  <h3 className="font-bold">Security Mode</h3>
                </div>

                <p className="text-slate-500 text-sm">
                  PIN verification and audit logs enabled.
                </p>
              </div>
            </Panel>
          </section>

          <button
            onClick={saveSettings}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save All Settings
          </button>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-blue-400">{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      {children}
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

function Toggle({ label, checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
    >
      <span>{label}</span>

      <span
        className={`w-14 h-7 rounded-full flex items-center px-1 ${
          checked ? "bg-blue-600 justify-end" : "bg-slate-700 justify-start"
        }`}
      >
        <span className="w-5 h-5 bg-white rounded-full" />
      </span>
    </button>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-2xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}