"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  RefreshCcw,
  Wifi,
  Battery,
  Database,
  CreditCard,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function SimManagerPage() {
  const [devices, setDevices] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/devices");
      setDevices(res.data.devices || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load SIMs.");
    } finally {
      setLoading(false);
    }
  };

  useGatewaySocket({
  "wallet-updated": loadDevices,
  "gsm-command-updated": loadDevices,
  "transaction-updated": loadDevices,
  "gateway-device-online": loadDevices,
  "gateway-device-offline": loadDevices,
  "gateway-location": loadDevices,
  "gateway-security-alert": loadDevices,
  "gsm-sims-synced": loadDevices,
});

  const refreshBalance = async (simId, type) => {
    try {
      await api.post("/gateway/sims/refresh-balance", { simId, type });
      setMessage(`${type} balance refresh command sent.`);
      loadDevices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Balance refresh failed.");
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return (
    <SuperAdminLayout
      title="GSM SIM Manager"
      description="Manage SIM1/SIM2, airtime balance, data balance and routing status."
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
        <p className="text-slate-400">Loading SIMs...</p>
      ) : devices.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-500">
          No gateway devices found.
        </div>
      ) : (
        <div className="space-y-8">
          {devices.map((device) => (
            <div
              key={device.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                    <Smartphone size={26} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">{device.name}</h2>
                    <p className="text-sm text-slate-500">{device.code}</p>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs ${
                    device.status === "ONLINE"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {device.status}
                </span>
              </div>

              {!device.sims || device.sims.length === 0 ? (
                <p className="text-slate-500">No SIM synced yet.</p>
              ) : (
                <div className="grid xl:grid-cols-2 gap-5">
                  {device.sims.map((sim) => (
                    <div
                      key={sim.id}
                      className="rounded-3xl border border-slate-800 bg-slate-950 p-5"
                    >
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold">
                            SIM {Number(sim.slotIndex) + 1}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {sim.carrierName || "Unknown Carrier"}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                          {sim.status || "ACTIVE"}
                        </span>
                      </div>

                      <Info
                        icon={<Wifi size={16} />}
                        label="Phone Number"
                        value={sim.phoneNumber || "Hidden by Android"}
                      />

                      <Info
                        icon={<CreditCard size={16} />}
                        label="Airtime Balance"
                        value={`₦${Number(
                          sim.airtimeBalance || 0
                        ).toLocaleString("en-US")}`}
                      />

                      <Info
                        icon={<Database size={16} />}
                        label="Data Balance"
                        value={sim.dataBalance || "-"}
                      />

                      <Info
                        icon={<Battery size={16} />}
                        label="Last Sync"
                        value={
                          sim.lastSyncAt
                            ? new Date(sim.lastSyncAt).toLocaleString()
                            : "-"
                        }
                      />

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => refreshBalance(sim.id, "AIRTIME")}
                          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700"
                        >
                          Refresh Airtime
                        </button>

                        <button
                          onClick={() => refreshBalance(sim.id, "DATA")}
                          className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-700"
                        >
                          Refresh Data
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-blue-400">{icon}</span>
        <span>{label}</span>
      </div>

      <span className="text-right font-semibold text-slate-200">{value}</span>
    </div>
  );
}