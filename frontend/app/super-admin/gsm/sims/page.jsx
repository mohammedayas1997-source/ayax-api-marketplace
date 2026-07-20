"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  RefreshCcw,
  Wifi,
  Battery,
  Database,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Radio,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

export default function SimManagerPage() {
  const [devices, setDevices] = useState([]);
  const [selectedSims, setSelectedSims] = useState({});
  const [refreshingKey, setRefreshingKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [phoneInputs, setPhoneInputs] = useState({});
  const [savingNumber, setSavingNumber] = useState("");

  const loadDevices = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const res = await api.get("/gateway/devices");
      const list = res.data.devices || [];

      setDevices(list);

      setSelectedSims((current) => {
        const next = { ...current };

        list.forEach((device) => {
          if (!next[device.id] && device.sims?.length > 0) {
            next[device.id] = device.sims[0].id;
          }
        });

        return next;
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to load gateway devices and SIMs."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useGatewaySocket({
    "gateway-device-online": () => loadDevices({ silent: true }),
    "gateway-device-offline": () => loadDevices({ silent: true }),
    "gsm-sims-synced": () => loadDevices({ silent: true }),
    "gsm-sim-balance-updated": () => loadDevices({ silent: true }),
    "gsm-command-updated": () => loadDevices({ silent: true }),
  });

  const refreshBalance = async (simId, type) => {
    const key = `${simId}-${type}`;

    try {
      setRefreshingKey(key);
      setMessage("");

      const res = await api.post("/gateway/sims/refresh-balance", {
        simId,
        type,
      });

      setMessage(
        res.data?.message ||
          `${type} balance refresh command sent successfully.`
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          `${type} balance refresh failed.`
      );
    } finally {
      setRefreshingKey("");
    }
  };

  const totalSims = useMemo(
    () =>
      devices.reduce(
        (total, device) => total + (device.sims?.length || 0),
        0
      ),
    [devices]
  );
  const savePhoneNumber = async (simId) => {
  const phoneNumber = String(phoneInputs[simId] || "").trim();

  if (!phoneNumber) {
    setMessage("Enter SIM phone number first.");
    return;
  }

  try {
    setSavingNumber(simId);

    const res = await api.patch(`/gateway/sims/${simId}/number`, {
      phoneNumber,
    });

    setMessage(res.data?.message || "SIM number saved.");
    await loadDevices({ silent: true });
  } catch (error) {
    setMessage(
      error.response?.data?.message ||
        "Failed to save SIM number."
    );
  } finally {
    setSavingNumber("");
  }
};

  return (
    <SuperAdminLayout
      title="GSM SIM Manager"
      description="Manage SIM slots, phone numbers, airtime, data balances and routing status."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Gateway Devices"
          value={devices.length}
          icon={<Smartphone size={22} />}
        />

        <SummaryCard
          title="Total SIMs"
          value={totalSims}
          icon={<Radio size={22} />}
        />

        <SummaryCard
          title="Online Devices"
          value={devices.filter((device) => device.status === "ONLINE").length}
          icon={<CheckCircle2 size={22} />}
        />
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => loadDevices()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading SIMs...</p>
      ) : devices.length === 0 ? (
        <EmptyState message="No gateway devices found." />
      ) : (
        <div className="space-y-8">
          {devices.map((device) => {
            const sims = device.sims || [];
            const selectedSimId =
              selectedSims[device.id] || sims[0]?.id || "";

            return (
              <section
                key={device.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400">
                      <Smartphone size={26} />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">
                        {device.name || "Unnamed Gateway"}
                      </h2>

                      <p className="text-sm text-slate-500">
                        {device.code || device.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {sims.length > 0 && (
                      <select
                        value={selectedSimId}
                        onChange={(event) =>
                          setSelectedSims((current) => ({
                            ...current,
                            [device.id]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none"
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
                    )}

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs ${
                        device.status === "ONLINE"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {device.status || "OFFLINE"}
                    </span>
                  </div>
                </div>

                {sims.length === 0 ? (
                  <EmptyState message="No SIM synced yet. Open the Android Gateway app and refresh SIM information." />
                ) : (
                  <div className="grid gap-5 xl:grid-cols-2">
                    {sims.map((sim) => {
                      const selected = selectedSimId === sim.id;
                      const airtimeKey = `${sim.id}-AIRTIME`;
                      const dataKey = `${sim.id}-DATA`;

                      return (
                        <article
                          key={sim.id}
                          className={`rounded-3xl border bg-slate-950 p-5 transition ${
                            selected
                              ? "border-blue-500"
                              : "border-slate-800"
                          }`}
                        >
                          <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">
                                  SIM {Number(sim.slotIndex) + 1}
                                </h3>

                                {selected && (
                                  <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400">
                                    SELECTED
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-slate-500">
                                {sim.carrierName ||
                                  sim.displayName ||
                                  "Unknown Carrier"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                sim.status === "ACTIVE"
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-yellow-500/10 text-yellow-400"
                              }`}
                            >
                              {sim.status || "ACTIVE"}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
  <div className="mb-3 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2 text-slate-400">
      <span className="text-blue-400">
        <Wifi size={16} />
      </span>

      <span>Phone Number</span>
    </div>

    <span className="max-w-[55%] break-words text-right font-semibold text-slate-200">
      {sim.phoneNumber || "Not provided by Android"}
    </span>
  </div>

  <div className="flex flex-col gap-3 sm:flex-row">
    <input
      type="tel"
      inputMode="tel"
      value={
        phoneInputs[sim.id] ??
        sim.phoneNumber ??
        ""
      }
      onChange={(event) =>
        setPhoneInputs((current) => ({
          ...current,
          [sim.id]: event.target.value,
        }))
      }
      placeholder="Enter SIM phone number"
      className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
    />

    <button
      type="button"
      onClick={() => savePhoneNumber(sim.id)}
      disabled={savingNumber === sim.id}
      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {savingNumber === sim.id
        ? "Saving..."
        : sim.phoneNumber
        ? "Update Number"
        : "Save Number"}
    </button>
  </div>
</div>


                            <Info
                              icon={<CreditCard size={16} />}
                              label="Airtime Balance"
                              value={formatMoney(sim.airtimeBalance)}
                            />

                            <Info
                              icon={<Database size={16} />}
                              label="Data Balance"
                              value={sim.dataBalance || "-"}
                            />

                            <Info
                              icon={<CalendarDays size={16} />}
                              label="Expiry Date"
                              value={
                                sim.expiryDate
                                  ? new Date(
                                      sim.expiryDate
                                    ).toLocaleDateString()
                                  : "-"
                              }
                            />

                            <Info
                              icon={<Battery size={16} />}
                              label="Last SIM Sync"
                              value={formatDateTime(sim.lastSyncAt)}
                            />

                            <Info
                              icon={<RefreshCcw size={16} />}
                              label="Last Balance Check"
                              value={formatDateTime(
                                sim.lastBalanceCheck
                              )}
                            />
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              onClick={() =>
                                setSelectedSims((current) => ({
                                  ...current,
                                  [device.id]: sim.id,
                                }))
                              }
                              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                                selected
                                  ? "bg-slate-700 text-white"
                                  : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              {selected ? "Selected SIM" : "Select SIM"}
                            </button>

                            <button
                              onClick={() =>
                                refreshBalance(sim.id, "AIRTIME")
                              }
                              disabled={refreshingKey === airtimeKey}
                              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {refreshingKey === airtimeKey
                                ? "Refreshing..."
                                : "Refresh Airtime"}
                            </button>

                            <button
                              onClick={() =>
                                refreshBalance(sim.id, "DATA")
                              }
                              disabled={refreshingKey === dataKey}
                              className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {refreshingKey === dataKey
                                ? "Refreshing..."
                                : "Refresh Data"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </SuperAdminLayout>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 text-blue-400">{icon}</div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-500">
      {message}
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-blue-400">{icon}</span>
        <span>{label}</span>
      </div>

      <span className="max-w-[55%] break-words text-right font-semibold text-slate-200">
        {value}
      </span>
    </div>
  );
}