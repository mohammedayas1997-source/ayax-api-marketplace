"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  RefreshCcw,
  PlusCircle,
  Trash2,
  Edit,
  Power,
  Copy,
  Battery,
  Signal,
  Bell,
  BellOff,
  Clock,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import { Lock } from "lucide-react";

export default function GatewayDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [pairCode, setPairCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/devices");
      setDevices(res.data.devices || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load devices.");
    } finally {
      setLoading(false);
    }
  };

  const generatePairCode = async () => {
    try {
      const res = await api.post("/gateway/pair-code/generate");
      setPairCode(res.data.code);
      setMessage("Pair code generated successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to generate pair code.");
    }
  };

  const renameDevice = async (device) => {
    const name = prompt("Enter new device name", device.name);
    if (!name) return;

    try {
      await api.patch(`/gateway/devices/${device.id}/rename`, { name });
      setMessage("Device renamed successfully.");
      loadDevices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Rename failed.");
    }
  };

  const disconnectDevice = async (device) => {
    try {
      await api.patch(`/gateway/devices/${device.id}/disconnect`);
      setMessage("Device disconnected.");
      loadDevices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Disconnect failed.");
    }
  };

  const deleteDevice = async (device) => {
    if (!confirm(`Delete ${device.name}?`)) return;

    try {
      await api.delete(`/gateway/devices/${device.id}`);
      setMessage("Device deleted.");
      loadDevices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Delete failed.");
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);
  const startAlarm = async (device) => {
  try {
    await api.post("/gateway/alarm/start", {
      deviceId: device.id,
    });

    setMessage("Alarm start command sent.");
  } catch (error) {
    setMessage(error.response?.data?.message || "Failed to start alarm.");
  }
};

const stopAlarm = async (device) => {
  try {
    await api.post("/gateway/alarm/stop", {
      deviceId: device.id,
    });

    setMessage("Alarm stop command sent.");
  } catch (error) {
    setMessage(error.response?.data?.message || "Failed to stop alarm.");
  }
};

const lockGateway = async (device) => {
  try {
    await api.post("/gateway/lock-device", {
      deviceId: device.id,
    });

    setMessage("Lock command sent.");
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
      "Failed to lock device."
    );
  }
};

  return (
    <SuperAdminLayout
      title="Gateway Devices"
      description="Manage Android GSM Gateway phones, pairing codes, status, battery and live monitoring."
    >
      {message && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
          {message}
        </div>
      )}

      <div className="mb-8 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold">Pair New Android Gateway</h2>
            <p className="text-slate-400 mt-2">
              Generate a temporary code and enter it inside the Android GSM Gateway app.
            </p>
          </div>

          <button
            onClick={generatePairCode}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Generate Pair Code
          </button>
        </div>

        {pairCode && (
          <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-slate-400 text-sm">Pair Code</p>
              <h3 className="text-3xl font-extrabold text-blue-400 mt-1">
                {pairCode}
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                This code expires in 5 minutes.
              </p>
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(pairCode)}
              className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
            >
              <Copy size={18} />
              Copy
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold">Connected Devices</h2>

        <button
          onClick={loadDevices}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl flex items-center gap-2"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading devices...</p>
      ) : devices.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-slate-500">
          No gateway device paired yet.
        </div>
      ) : (
        <div className="grid xl:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center">
                    <Smartphone size={28} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">{device.name}</h3>
                    <p className="text-sm text-slate-500">{device.code}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    device.status === "ONLINE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {device.status}
                </span>
              </div>

              <div className="space-y-3">
                <Info
                  icon={<Battery size={16} />}
                  label="Battery"
                  value={`${device.battery || 0}%`}
                />
                <Info
                  icon={<Signal size={16} />}
                  label="Signal"
                  value={`${device.signal || 0}%`}
                />
                <Info
                  icon={<Clock size={16} />}
                  label="Last Seen"
                  value={
                    device.lastSeen
                      ? new Date(device.lastSeen).toLocaleString()
                      : "Never"
                  }
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => renameDevice(device)}
                  className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => disconnectDevice(device)}
                  className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 p-3 rounded-xl"
                >
                  <Power size={16} />
                </button>

                <button
                  onClick={() => deleteDevice(device)}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-3 rounded-xl"
                >
                  <Trash2 size={16} />
                </button>

                <button
                onClick={() => startAlarm(device)}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-3 rounded-xl"
                title="Ring Alarm"
                >
                <Bell size={16} />
                </button>

                <button
                onClick={() => stopAlarm(device)}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 p-3 rounded-xl"
                title="Stop Alarm"
                >
                <BellOff size={16} />
                </button>

                <button
                onClick={() => lockGateway(device)}
                className="rounded-xl bg-orange-500/10 p-3 text-orange-400 hover:bg-orange-500/20"
                title="Lock Device"
                >
                <Lock size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-blue-400">{icon}</span>
        <span>{label}</span>
      </div>

      <span className="font-semibold">{value}</span>
    </div>
  );
}