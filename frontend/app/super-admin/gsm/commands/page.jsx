"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  RefreshCcw,
  MessageSquare,
  Radio,
  CreditCard,
  Database,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function GatewayCommandCenterPage() {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [simId, setSimId] = useState("");
  const [type, setType] = useState("SEND_SMS");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [ussdCode, setUssdCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [commands, setCommands] = useState([]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === deviceId) || null,
    [devices, deviceId]
  );

  const sims = selectedDevice?.sims || [];

  const selectedSim = useMemo(
    () => sims.find((sim) => sim.id === simId) || null,
    [sims, simId]
  );

  const loadDevices = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await api.get("/gateway/devices");
      const list = res.data.devices || [];

      setDevices(list);

      setDeviceId((currentDeviceId) => {
        const nextDeviceId =
          currentDeviceId && list.some((item) => item.id === currentDeviceId)
            ? currentDeviceId
            : list[0]?.id || "";

        const nextDevice = list.find((item) => item.id === nextDeviceId);
        const nextSims = nextDevice?.sims || [];

        setSimId((currentSimId) =>
          currentSimId && nextSims.some((item) => item.id === currentSimId)
            ? currentSimId
            : nextSims[0]?.id || ""
        );

        return nextDeviceId;
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load gateway devices."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadCommands = async () => {
    try {
      const res = await api.get("/commands");
      setCommands(res.data.commands || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load commands."
      );
    }
  };

  useEffect(() => {
    loadDevices();
    loadCommands();
  }, []);

  useGatewaySocket({
    "gsm-command-updated": loadCommands,
    "transaction-updated": loadCommands,
    "gateway-device-online": () => loadDevices({ silent: true }),
    "gateway-device-offline": () => loadDevices({ silent: true }),
    "gsm-sims-synced": () => loadDevices({ silent: true }),
    "gsm-sim-balance-updated": () => loadDevices({ silent: true }),
  });

  const selectDevice = (nextDeviceId) => {
    const device = devices.find((item) => item.id === nextDeviceId);

    setDeviceId(nextDeviceId);
    setSimId(device?.sims?.[0]?.id || "");
  };

  const sendCommand = async () => {
    try {
      setMessage("");

      if (!deviceId) {
        setMessage("Please select a gateway device.");
        return;
      }

      if (!simId || !selectedSim) {
        setMessage("Please select a SIM card.");
        return;
      }

      setSending(true);

      const basePayload = {
        deviceId,
        simId,
        simSlot: Number(selectedSim.slotIndex ?? 0),
      };

      if (type === "SEND_SMS") {
        const cleanPhoneNumber = phoneNumber.trim();
        const cleanMessage = smsMessage.trim();

        if (!cleanPhoneNumber || !cleanMessage) {
          setMessage(
            "Phone number and SMS message are required."
          );
          return;
        }

        const res = await api.post("/commands/sms", {
          ...basePayload,
          phoneNumber: cleanPhoneNumber,
          message: cleanMessage,
        });

        setMessage(
          res.data.message || "SMS command sent successfully."
        );
        setSmsMessage("");
        await loadCommands();
        return;
      }

      if (type === "USSD") {
        const cleanUssdCode = ussdCode.trim();

        if (!cleanUssdCode) {
          setMessage("USSD code is required.");
          return;
        }

        const res = await api.post("/commands/ussd", {
          ...basePayload,
          ussdCode: cleanUssdCode,
        });

        setMessage(
          res.data.message || "USSD command sent successfully."
        );
        setUssdCode("");
        await loadCommands();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to send command."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SuperAdminLayout
      title="Gateway Command Center"
      description="Send SMS and USSD commands through a selected Android gateway and SIM card."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Gateway Devices
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Select the Android phone that should execute the
                command.
              </p>
            </div>

            <button
              onClick={() => loadDevices()}
              disabled={loading}
              className="rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400">
              Loading devices...
            </p>
          ) : devices.length === 0 ? (
            <p className="text-slate-500">
              No gateway devices found.
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => selectDevice(device.id)}
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
                      <h3 className="font-bold">
                        {device.name || "Unnamed Gateway"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {device.code}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {device.sims?.length || 0} SIM(s)
                      </p>
                    </div>

                    <span
                      className={`ml-auto rounded-full px-3 py-1 text-xs ${
                        device.status === "ONLINE"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {device.status || "OFFLINE"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedDevice && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <label className="text-sm text-slate-400">
                Select SIM
              </label>

              {sims.length === 0 ? (
                <p className="mt-3 text-sm text-red-400">
                  No SIM has been synced for this gateway.
                </p>
              ) : (
                <>
                  <select
                    value={simId}
                    onChange={(event) =>
                      setSimId(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 outline-none"
                  >
                    {sims.map((sim) => (
                      <option key={sim.id} value={sim.id}>
                        SIM {Number(sim.slotIndex) + 1} —{" "}
                        {sim.phoneNumber ||
                          sim.carrierName ||
                          "Unknown"}
                      </option>
                    ))}
                  </select>

                  {selectedSim && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MiniInfo
                        label="Network"
                        value={
                          selectedSim.carrierName ||
                          selectedSim.displayName ||
                          "Unknown"
                        }
                      />

                      <MiniInfo
                        label="Phone Number"
                        value={
                          selectedSim.phoneNumber ||
                          "Not provided by Android"
                        }
                      />

                      <MiniInfo
                        label="Airtime Balance"
                        value={`₦${Number(
                          selectedSim.airtimeBalance || 0
                        ).toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                        icon={<CreditCard size={15} />}
                      />

                      <MiniInfo
                        label="Data Balance"
                        value={
                          selectedSim.dataBalance || "-"
                        }
                        icon={<Database size={15} />}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">
            Send Command
          </h2>

          <label className="text-sm text-slate-400">
            Command Type
          </label>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value)
            }
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
          >
            <option value="SEND_SMS">Send SMS</option>
            <option value="USSD">USSD</option>
          </select>

          {type === "SEND_SMS" ? (
            <div className="mt-5 space-y-4">
              <Input
                label="Destination Phone Number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="08012345678"
              />

              <div>
                <label className="text-sm text-slate-400">
                  Message
                </label>

                <textarea
                  value={smsMessage}
                  onChange={(event) =>
                    setSmsMessage(event.target.value)
                  }
                  placeholder="Type SMS message..."
                  className="mt-2 min-h-36 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
                />
              </div>

              <button
                onClick={sendCommand}
                disabled={sending || !simId}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageSquare size={18} />
                {sending
                  ? "Sending..."
                  : "Send SMS Command"}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <Input
                label="USSD Code"
                value={ussdCode}
                onChange={setUssdCode}
                placeholder="*310#"
              />

              <button
                onClick={sendCommand}
                disabled={sending || !simId}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Radio size={18} />
                {sending
                  ? "Sending..."
                  : "Send USSD Command"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold">
            Command History
          </h2>
        </div>

        {commands.length === 0 ? (
          <div className="p-8 text-slate-500">
            No command history yet.
          </div>
        ) : (
          commands.map((cmd) => (
            <div
              key={cmd.id}
              className="grid gap-4 border-b border-slate-800 px-6 py-5 xl:grid-cols-5"
            >
              <span className="break-all font-bold">
                {cmd.reference}
              </span>

              <span>{cmd.type}</span>

              <span>
                {cmd.device?.name ||
                  cmd.deviceId ||
                  "-"}
              </span>

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
                {cmd.createdAt
                  ? new Date(
                      cmd.createdAt
                    ).toLocaleString()
                  : "-"}
              </span>
            </div>
          ))
        )}
      </div>
    </SuperAdminLayout>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
      />
    </div>
  );
}

function MiniInfo({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon && (
          <span className="text-blue-400">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>

      <p className="mt-1 break-words text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}