"use client";

import { useEffect, useState } from "react";
import { Send, Smartphone, RefreshCcw, MessageSquare, Radio } from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";

export default function GatewayCommandCenterPage() {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [type, setType] = useState("SEND_SMS");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [ussdCode, setUssdCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState([]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/devices");
      const list = res.data.devices || [];

      setDevices(list);

      if (list.length > 0 && !deviceId) {
        setDeviceId(list[0].id);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load gateway devices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    loadCommands();
  }, []);

  const loadCommands = async () => {
  const res = await api.get("/commands");
  setCommands(res.data.commands || []);
};

  const sendCommand = async () => {
    try {
      if (!deviceId) {
        setMessage("Please select a gateway device.");
        return;
      }

      if (type === "SEND_SMS") {
        if (!phoneNumber || !smsMessage) {
          setMessage("Phone number and SMS message are required.");
          return;
        }

        const res = await api.post("/commands/sms", {
          deviceId,
          phoneNumber,
          message: smsMessage,
        });

        setMessage(res.data.message || "SMS command sent successfully.");
        setSmsMessage("");
        loadCommands();
        return;
      }

      if (type === "USSD") {
        if (!ussdCode) {
          setMessage("USSD code is required.");
          return;
        }

        const res = await api.post("/commands/ussd", {
          deviceId,
          ussdCode,
        });

        setMessage(res.data.message || "USSD command sent successfully.");
        setUssdCode("");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to send command.");
    }
  };

  return (
    <SuperAdminLayout
      title="Gateway Command Center"
      description="Send test SMS and USSD commands to Android GSM Gateway devices."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Gateway Devices</h2>
              <p className="mt-2 text-sm text-slate-400">
                Select the Android phone that should execute the command.
              </p>
            </div>

            <button
              onClick={loadDevices}
              className="rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700"
            >
              <RefreshCcw size={18} />
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading devices...</p>
          ) : devices.length === 0 ? (
            <p className="text-slate-500">No gateway devices found.</p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => setDeviceId(device.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    deviceId === device.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-blue-500"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400">
                      <Smartphone size={20} />
                    </div>

                    <div>
                      <h3 className="font-bold">{device.name}</h3>
                      <p className="text-xs text-slate-500">{device.code}</p>
                    </div>

                    <span
                      className={`ml-auto rounded-full px-3 py-1 text-xs ${
                        device.status === "ONLINE"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">Send Command</h2>

          <label className="text-sm text-slate-400">Command Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="SEND_SMS">Send SMS</option>
            <option value="USSD">USSD</option>
          </select>

          {type === "SEND_SMS" ? (
            <div className="mt-5 space-y-4">
              <Input
                label="Phone Number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="08012345678"
              />

              <div>
                <label className="text-sm text-slate-400">Message</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type SMS message..."
                  className="mt-2 min-h-36 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
                />
              </div>

              <button
                onClick={sendCommand}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700"
              >
                <MessageSquare size={18} />
                Send SMS Command
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <Input
                label="USSD Code"
                value={ussdCode}
                onChange={setUssdCode}
                placeholder="*312#"
              />

              <button
                onClick={sendCommand}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700"
              >
                <Radio size={18} />
                Send USSD Command
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
  <div className="border-b border-slate-800 px-6 py-4">
    <h2 className="text-xl font-bold">Command History</h2>
  </div>

  {commands.length === 0 ? (
    <div className="p-8 text-slate-500">No command history yet.</div>
  ) : (
    commands.map((cmd) => (
      <div
        key={cmd.id}
        className="grid xl:grid-cols-5 gap-4 border-b border-slate-800 px-6 py-5"
      >
        <span className="font-bold">{cmd.reference}</span>
        <span>{cmd.type}</span>
        <span>{cmd.device?.name || cmd.deviceId}</span>
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs ${
            cmd.status === "SUCCESSFUL"
              ? "bg-green-500/10 text-green-400"
              : cmd.status === "FAILED"
              ? "bg-red-500/10 text-red-400"
              : "bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {cmd.status}
        </span>
        <span className="text-slate-400">
          {cmd.createdAt ? new Date(cmd.createdAt).toLocaleString() : "-"}
        </span>
      </div>
    ))
  )}
</div>
    </SuperAdminLayout>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
      />
    </div>
  );
}