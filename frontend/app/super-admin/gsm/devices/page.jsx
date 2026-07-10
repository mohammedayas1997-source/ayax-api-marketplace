"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  Battery,
  Wifi,
  Signal,
  Search,
  RefreshCcw,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
} from "lucide-react";
import useGatewaySocket from "@/hooks/useGatewaySocket";

import api from "@/lib/api";
import DashboardLayout from "../../components/DashboardLayout";

export default function GSMDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [query, setQuery] = useState("");
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

  useEffect(() => {
    loadDevices();
  }, []);

  useGatewaySocket({

    "wallet-updated": loadData,

    "gsm-command-updated": loadData,

    "transaction-updated": loadData,

    "gateway-device-online": loadData,

    "gateway-device-offline": loadData,

});

  const filteredDevices = useMemo(() => {
    const q = query.toLowerCase();

    return devices.filter((device) => {
      return (
        device.name?.toLowerCase().includes(q) ||
        device.code?.toLowerCase().includes(q) ||
        device.location?.toLowerCase().includes(q) ||
        device.status?.toLowerCase().includes(q)
      );
    });
  }, [devices, query]);

  return (
    <DashboardLayout
      title="GSM Gateway Devices"
      description="Monitor Android GSM gateway phones, battery, signal, internet and last seen status."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-5 mb-8">
        <Stat title="Total Devices" value={devices.length} icon={<Smartphone />} />
        <Stat
          title="Online"
          value={devices.filter((d) => d.status === "ONLINE").length}
          icon={<CheckCircle />}
        />
        <Stat
          title="Offline"
          value={devices.filter((d) => d.status === "OFFLINE").length}
          icon={<XCircle />}
        />
        <Stat
          title="Busy"
          value={devices.filter((d) => d.status === "BUSY").length}
          icon={<RefreshCcw />}
        />
      </div>

      <div className="mb-6 grid lg:grid-cols-[1fr_180px] gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search device, code, location or status..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <button
          onClick={loadDevices}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-slate-400">Loading devices...</p>
        ) : filteredDevices.length === 0 ? (
          <p className="text-slate-500">No devices found.</p>
        ) : (
          filteredDevices.map((device) => (
            <div
              key={device.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                    <Smartphone size={28} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">{device.name}</h2>
                    <p className="text-sm text-slate-500">{device.code}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    device.status === "ONLINE"
                      ? "bg-green-500/10 text-green-400"
                      : device.status === "BUSY"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {device.status}
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <Info icon={<Battery />} label="Battery" value={`${device.battery || 0}%`} />
                <Info icon={<Signal />} label="Signal" value={`${device.signal || 0}%`} />
                <Info
                  icon={<Wifi />}
                  label="Internet"
                  value={device.internet ? "Connected" : "Disconnected"}
                />
                <Info
                  icon={<MapPin />}
                  label="Location"
                  value={device.location || "Not set"}
                />
                <Info
                  icon={<Clock />}
                  label="Last Seen"
                  value={
                    device.lastSeen
                      ? new Date(device.lastSeen).toLocaleString()
                      : "Never"
                  }
                />
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 text-blue-400">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="mt-2 text-3xl font-extrabold">{value}</h2>
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="text-blue-400">{icon}</span>
        <span>{label}</span>
      </div>

      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}