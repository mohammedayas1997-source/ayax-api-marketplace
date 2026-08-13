"use client";

import { useEffect, useState } from "react";
import { MapPin, RefreshCcw, Smartphone } from "lucide-react";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function LiveLocationPage() {
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/devices");
      setDevices(res.data.devices || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load locations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useGatewaySocket({
    "gateway-location": loadDevices,
    "gateway-device-online": loadDevices,
    "gateway-device-offline": loadDevices,
  });

  return (
    <SuperAdminLayout
      title="Live Gateway Location"
      description="Track Android GSM Gateway devices in real time."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          onClick={loadDevices}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading locations...</p>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                    <Smartphone size={24} />
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
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {device.status}
                </span>
              </div>

              <Info label="Latitude" value={device.latitude || "-"} />
              <Info label="Longitude" value={device.longitude || "-"} />
              <Info label="Accuracy" value={device.accuracy ? `${device.accuracy}m` : "-"} />
              <Info label="Speed" value={device.speed ? `${device.speed} m/s` : "-"} />
              <Info
                label="Last Location"
                value={
                  device.locationAt
                    ? new Date(device.locationAt).toLocaleString()
                    : "-"
                }
              />

              {device.latitude && device.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${device.latitude},${device.longitude}`}
                  target="_blank"
                  className="mt-5 flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-700"
                >
                  <MapPin size={18} />
                  Open in Google Maps
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 flex justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}