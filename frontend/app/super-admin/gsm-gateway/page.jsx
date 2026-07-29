"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircuitBoard,
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  ShoppingCart,
  Search,
  BatteryCharging,
  Signal,
  Activity,
  LockKeyhole,
  Wifi,
  WifiOff,
  LoaderCircle,
} from "lucide-react";
import { io } from "socket.io-client";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";
import api from "@/lib/api";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

const RECHARGE_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const normalizeSim = (sim = {}) => ({
  id: sim.id || sim._id || "",
  slot: Number(sim.slot || sim.slotNumber || 0),
  name:
    sim.name ||
    `SIM ${sim.slot || sim.slotNumber || "-"}`,
  number:
    sim.number ||
    sim.phoneNumber ||
    sim.msisdn ||
    "-",
  type: String(
    sim.type || sim.simType || "DATA"
  ).toUpperCase(),
  network: String(
    sim.network || "UNKNOWN"
  ).toUpperCase(),
  balance: Number(sim.balance || 0),
  status:
    sim.status ||
    (sim.isOnline === false
      ? "Offline"
      : Number(sim.balance || 0) < 1000
        ? "Low Balance"
        : "Active"),
  signal:
    sim.signal ||
    sim.signalStrength ||
    "Unknown",
  usage: Number(
    sim.usage ||
      sim.usageCount ||
      sim.transactionsCount ||
      0
  ),
  isOnline:
    sim.isOnline ??
    sim.online ??
    sim.status !== "Offline",
  lastSeenAt:
    sim.lastSeenAt ||
    sim.updatedAt ||
    null,
});

const getSocketUrl = () => {
  const explicitUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "";

  return apiUrl.replace(/\/api\/v1\/?$/, "");
};

export default function SuperGSMGatewayPage() {
  const [sims, setSims] = useState([]);
  const [selectedSimId, setSelectedSimId] =
    useState("");
  const [history, setHistory] = useState([]);
  const [serverStats, setServerStats] =
    useState(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("ALL");
  const [networkFilter, setNetworkFilter] =
    useState("ALL");

  const [rechargeAmount, setRechargeAmount] =
    useState("");
  const [customAmount, setCustomAmount] =
    useState("");
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] =
    useState(false);
  const [autoSelecting, setAutoSelecting] =
    useState(false);
  const [refreshing, setRefreshing] =
    useState(false);
  const [message, setMessage] = useState("");
  const [socketConnected, setSocketConnected] =
    useState(false);
  const [lastUpdated, setLastUpdated] =
    useState(null);

  const selectedSim = useMemo(
    () =>
      sims.find(
        (sim) => sim.id === selectedSimId
      ) ||
      sims[0] ||
      null,
    [sims, selectedSimId]
  );

  const showMessage = useCallback(
    (text) => {
      setMessage(text);

      window.clearTimeout(
        window.__gsmGatewayMessageTimer
      );

      window.__gsmGatewayMessageTimer =
        window.setTimeout(() => {
          setMessage("");
        }, 6000);
    },
    []
  );

  const applySimUpdate = useCallback(
    (incomingSim) => {
      const updated = normalizeSim(incomingSim);

      if (!updated.id) return;

      setSims((current) => {
        const exists = current.some(
          (sim) => sim.id === updated.id
        );

        if (!exists) {
          return [...current, updated].sort(
            (a, b) => a.slot - b.slot
          );
        }

        return current.map((sim) =>
          sim.id === updated.id
            ? { ...sim, ...updated }
            : sim
        );
      });

      setLastUpdated(new Date());
    },
    []
  );

  const loadGatewayData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const [simsRes, statsRes, historyRes] =
          await Promise.all([
            api.get("/gsm-gateway/sims"),
            api.get("/gsm-gateway/statistics"),
            api.get("/gsm-gateway/recharges", {
              params: { limit: 50 },
            }),
          ]);

        const simRecords =
          simsRes.data?.sims ||
          simsRes.data?.data ||
          [];

        const normalizedSims = Array.isArray(
          simRecords
        )
          ? simRecords
              .map(normalizeSim)
              .sort((a, b) => a.slot - b.slot)
          : [];

        setSims(normalizedSims);
        setServerStats(
          statsRes.data?.stats ||
            statsRes.data?.data ||
            null
        );

        const rechargeRecords =
          historyRes.data?.recharges ||
          historyRes.data?.history ||
          historyRes.data?.data ||
          [];

        setHistory(
          Array.isArray(rechargeRecords)
            ? rechargeRecords
            : []
        );

        setSelectedSimId((current) => {
          if (
            current &&
            normalizedSims.some(
              (sim) => sim.id === current
            )
          ) {
            return current;
          }

          return normalizedSims[0]?.id || "";
        });

        setLastUpdated(new Date());
      } catch (error) {
        showMessage(
          error.response?.data?.message ||
            error.userMessage ||
            "Failed to load live GSM gateway data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showMessage]
  );

  useEffect(() => {
    loadGatewayData();
  }, [loadGatewayData]);

  useEffect(() => {
    const socketUrl = getSocketUrl();

    if (!socketUrl) {
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token:
          typeof window !== "undefined"
            ? localStorage.getItem("token") ||
              localStorage.getItem(
                "accessToken"
              )
            : null,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("gsm-gateway:subscribe");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    socket.on("gsm:sim-updated", applySimUpdate);
    socket.on(
      "gsm:balance-updated",
      applySimUpdate
    );
    socket.on(
      "gsm:signal-updated",
      applySimUpdate
    );
    socket.on(
      "gsm:status-updated",
      applySimUpdate
    );

    socket.on("gsm:recharge-created", (record) => {
      setHistory((current) => [
        record,
        ...current.filter(
          (item) => item.id !== record.id
        ),
      ]);

      if (record.sim) {
        applySimUpdate(record.sim);
      }

      showMessage(
        record.message ||
          "SIM recharge completed successfully."
      );
    });

    socket.on("gsm:low-balance", (payload) => {
      if (payload?.sim) {
        applySimUpdate(payload.sim);
      }

      showMessage(
        payload?.message ||
          `${payload?.sim?.name || "A SIM"} has low balance.`
      );
    });

    socket.on(
      "gsm:gateway-stats",
      (payload) => {
        setServerStats(
          payload?.stats || payload
        );
        setLastUpdated(new Date());
      }
    );

    return () => {
      socket.emit("gsm-gateway:unsubscribe");
      socket.disconnect();
    };
  }, [applySimUpdate, showMessage]);

  const filteredSims = useMemo(() => {
    const value = query.trim().toLowerCase();

    return sims.filter((sim) => {
      const searchable = [
        sim.name,
        sim.number,
        sim.network,
        sim.type,
        sim.status,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !value || searchable.includes(value);

      const matchesType =
        typeFilter === "ALL" ||
        sim.type === typeFilter;

      const matchesNetwork =
        networkFilter === "ALL" ||
        sim.network === networkFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesNetwork
      );
    });
  }, [
    sims,
    query,
    typeFilter,
    networkFilter,
  ]);

  const stats = useMemo(
    () => ({
      total:
        serverStats?.total ?? sims.length,
      data:
        serverStats?.data ??
        sims.filter(
          (sim) => sim.type === "DATA"
        ).length,
      vtu:
        serverStats?.vtu ??
        sims.filter(
          (sim) => sim.type === "VTU"
        ).length,
      low:
        serverStats?.lowBalance ??
        serverStats?.low ??
        sims.filter(
          (sim) =>
            sim.balance < 1000 ||
            sim.status === "Low Balance"
        ).length,
    }),
    [serverStats, sims]
  );

  const rechargeSim = async () => {
    if (!selectedSim) {
      showMessage("Please select a SIM.");
      return;
    }

    const amount =
      rechargeAmount === "CUSTOM"
        ? Number(customAmount)
        : Number(rechargeAmount);

    if (
      !Number.isFinite(amount) ||
      amount < 100
    ) {
      showMessage(
        "Enter a valid recharge amount of at least ₦100."
      );
      return;
    }

    if (!pin.trim()) {
      showMessage(
        "Enter your Super Admin PIN."
      );
      return;
    }

    try {
      setRecharging(true);
      setMessage("");

      const response = await api.post(
        `/gsm-gateway/sims/${selectedSim.id}/recharge`,
        {
          amount,
          pin: pin.trim(),
        }
      );

      const updatedSim =
        response.data?.sim ||
        response.data?.data?.sim;

      const recharge =
        response.data?.recharge ||
        response.data?.data?.recharge;

      if (updatedSim) {
        applySimUpdate(updatedSim);
      } else {
        await loadGatewayData({
          silent: true,
        });
      }

      if (recharge) {
        setHistory((current) => [
          recharge,
          ...current.filter(
            (item) =>
              item.id !== recharge.id
          ),
        ]);
      }

      setRechargeAmount("");
      setCustomAmount("");
      setPin("");

      showMessage(
        response.data?.message ||
          `${selectedSim.name} recharged successfully.`
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "SIM recharge failed."
      );
    } finally {
      setRecharging(false);
    }
  };

  const autoSelectBestSim = async () => {
    try {
      setAutoSelecting(true);
      setMessage("");

      const response = await api.post(
        "/gsm-gateway/auto-select",
        {
          type:
            typeFilter === "ALL"
              ? undefined
              : typeFilter,
          network:
            networkFilter === "ALL"
              ? undefined
              : networkFilter,
          minimumBalance: 1000,
        }
      );

      const bestSim = normalizeSim(
        response.data?.sim ||
          response.data?.data?.sim
      );

      if (!bestSim.id) {
        throw new Error(
          "No suitable SIM returned."
        );
      }

      applySimUpdate(bestSim);
      setSelectedSimId(bestSim.id);

      showMessage(
        response.data?.message ||
          `${bestSim.name} selected automatically.`
      );
    } catch (error) {
      showMessage(
        error.response?.data?.message ||
          error.userMessage ||
          "No active SIM with enough balance was found."
      );
    } finally {
      setAutoSelecting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex">
          <SuperSidebar />

          <section className="flex-1 p-6 lg:p-10">
            <SuperTopbar title="GSM Gateway Control Center" />

            <div className="flex min-h-[60vh] items-center justify-center">
              <LoaderCircle
                size={38}
                className="animate-spin text-blue-400"
              />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="min-w-0 flex-1 p-6 lg:p-10">
          <SuperTopbar title="GSM Gateway Control Center" />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                socketConnected
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {socketConnected ? (
                <Wifi size={16} />
              ) : (
                <WifiOff size={16} />
              )}

              {socketConnected
                ? "Live gateway connected"
                : "Live gateway disconnected"}
            </div>

            <p className="text-sm text-slate-500">
              Last updated:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleString(
                    "en-US"
                  )
                : "Never"}
            </p>
          </div>

          {message && (
            <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
              {message}
            </div>
          )}

          <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              title="Total SIMs"
              value={stats.total}
              icon={<CircuitBoard />}
            />
            <Stat
              title="Data SIMs"
              value={stats.data}
              icon={<Smartphone />}
            />
            <Stat
              title="VTU SIMs"
              value={stats.vtu}
              icon={<Wallet />}
            />
            <Stat
              title="Low Balance"
              value={stats.low}
              icon={<AlertTriangle />}
            />
          </section>

          <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_210px_140px]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
                <Search
                  size={18}
                  className="text-slate-500"
                />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search SIM, number, network or type..."
                  className="w-full bg-transparent py-4 text-white outline-none placeholder:text-slate-600"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 outline-none"
              >
                <option value="ALL">
                  All Types
                </option>
                <option value="DATA">
                  DATA
                </option>
                <option value="VTU">
                  VTU
                </option>
              </select>

              <select
                value={networkFilter}
                onChange={(event) =>
                  setNetworkFilter(
                    event.target.value
                  )
                }
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 outline-none"
              >
                <option value="ALL">
                  All Networks
                </option>
                <option value="MTN">
                  MTN
                </option>
                <option value="AIRTEL">
                  Airtel
                </option>
                <option value="GLO">
                  GLO
                </option>
                <option value="9MOBILE">
                  9mobile
                </option>
              </select>

              <button
                type="button"
                disabled={autoSelecting}
                onClick={autoSelectBestSim}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={18}
                  className={
                    autoSelecting
                      ? "animate-spin"
                      : ""
                  }
                />

                {autoSelecting
                  ? "Selecting..."
                  : "Auto Select"}
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() =>
                  loadGatewayData({
                    silent: true,
                  })
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 font-semibold hover:bg-slate-700 disabled:opacity-60"
              >
                <RefreshCcw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center gap-3">
                <CircuitBoard className="text-blue-400" />
                <h2 className="text-xl font-bold">
                  GSM Gateway SIM Slots
                </h2>
              </div>

              {filteredSims.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                  No live SIM records found.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {filteredSims.map((sim) => (
                    <button
                      type="button"
                      key={sim.id}
                      onClick={() =>
                        setSelectedSimId(sim.id)
                      }
                      className={`rounded-3xl border p-4 text-left transition ${
                        selectedSim?.id === sim.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-800 bg-slate-950 hover:border-blue-500"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="font-bold">
                          {sim.name}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            sim.type === "DATA"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          {sim.type}
                        </span>
                      </div>

                      <NetworkLabel
                        network={sim.network}
                      />

                      <p className="mt-2 text-sm text-slate-500">
                        {sim.number}
                      </p>

                      <h4 className="mt-3 text-2xl font-extrabold">
                        {formatNaira(
                          sim.balance
                        )}
                      </h4>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge sim={sim} />

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                            sim.signal === "Strong"
                              ? "bg-blue-500/10 text-blue-400"
                              : sim.signal ===
                                  "Unknown"
                                ? "bg-slate-800 text-slate-400"
                                : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          <Signal size={13} />
                          {sim.signal}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <BatteryCharging className="text-blue-400" />
                  <h2 className="text-xl font-bold">
                    Selected SIM Details
                  </h2>
                </div>

                {selectedSim ? (
                  <div className="space-y-4">
                    <ReadOnly
                      label="SIM Slot"
                      value={selectedSim.name}
                    />
                    <ReadOnly
                      label="SIM Number"
                      value={selectedSim.number}
                    />
                    <ReadOnly
                      label="Network"
                      value={selectedSim.network}
                    />
                    <ReadOnly
                      label="SIM Type"
                      value={selectedSim.type}
                    />
                    <ReadOnly
                      label="Balance"
                      value={formatNaira(
                        selectedSim.balance
                      )}
                    />
                    <ReadOnly
                      label="Status"
                      value={selectedSim.status}
                    />
                    <ReadOnly
                      label="Signal"
                      value={selectedSim.signal}
                    />
                    <ReadOnly
                      label="Usage Count"
                      value={selectedSim.usage}
                    />
                    <ReadOnly
                      label="Last Seen"
                      value={
                        selectedSim.lastSeenAt
                          ? new Date(
                              selectedSim.lastSeenAt
                            ).toLocaleString(
                              "en-US"
                            )
                          : "Not available"
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No SIM is currently selected.
                  </p>
                )}

                <p className="mt-4 text-xs text-red-400">
                  SIM numbers are read-only and can only
                  be changed from the secured gateway
                  backend.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ShoppingCart className="text-blue-400" />
                  <h2 className="text-xl font-bold">
                    Recharge Company SIM
                  </h2>
                </div>

                <label className="text-sm text-slate-400">
                  Recharge Amount
                </label>

                <select
                  value={rechargeAmount}
                  onChange={(event) =>
                    setRechargeAmount(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
                >
                  <option value="">
                    Choose amount
                  </option>

                  {RECHARGE_AMOUNTS.map(
                    (amount) => (
                      <option
                        key={amount}
                        value={amount}
                      >
                        {formatNaira(amount)}
                      </option>
                    )
                  )}

                  <option value="CUSTOM">
                    Custom amount
                  </option>
                </select>

                {rechargeAmount === "CUSTOM" && (
                  <>
                    <label className="mt-4 block text-sm text-slate-400">
                      Custom Amount
                    </label>

                    <input
                      type="number"
                      min="100"
                      value={customAmount}
                      onChange={(event) =>
                        setCustomAmount(
                          event.target.value
                        )
                      }
                      placeholder="Enter amount"
                      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
                    />
                  </>
                )}

                <label className="mt-4 block text-sm text-slate-400">
                  Super Admin PIN
                </label>

                <input
                  type="password"
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value)
                  }
                  placeholder="Enter secure PIN"
                  autoComplete="off"
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 outline-none"
                />

                <button
                  type="button"
                  disabled={
                    recharging || !selectedSim
                  }
                  onClick={rechargeSim}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recharging ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <ShoppingCart size={18} />
                  )}

                  {recharging
                    ? "Processing Recharge..."
                    : `Recharge ${
                        selectedSim?.name || "SIM"
                      }`}
                </button>

                <p className="mt-4 text-xs text-slate-500">
                  PIN validation and the actual recharge
                  are handled securely by the backend.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Activity className="text-blue-400" />
                  <h2 className="text-xl font-bold">
                    Live Recharge History
                  </h2>
                </div>

                {history.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No recharge record is available.
                  </p>
                ) : (
                  <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={
                          item.id ||
                          item._id ||
                          `${item.createdAt}-${item.amount}`
                        }
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <h3 className="font-bold">
                          {item.sim?.name ||
                            item.simName ||
                            "SIM"}{" "}
                          -{" "}
                          {formatNaira(
                            item.amount
                          )}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.sim?.number ||
                            item.number ||
                            "-"}{" "}
                          •{" "}
                          {item.sim?.network ||
                            item.network ||
                            "-"}{" "}
                          •{" "}
                          {item.status ||
                            "COMPLETED"}
                        </p>

                        <p className="mt-2 text-xs text-slate-600">
                          {item.createdAt ||
                          item.date
                            ? new Date(
                                item.createdAt ||
                                  item.date
                              ).toLocaleString(
                                "en-US"
                              )
                            : "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <LockKeyhole className="text-blue-400" />
                  <h2 className="text-xl font-bold">
                    Gateway Security
                  </h2>
                </div>

                <div className="space-y-3 leading-7 text-slate-400">
                  <p>
                    Live SIM information comes directly
                    from the backend gateway.
                  </p>
                  <p>
                    Recharge PIN is never stored in the
                    browser.
                  </p>
                  <p>
                    Socket.IO delivers balance, signal,
                    status and low-balance updates.
                  </p>
                  <p>
                    Staff can view SIM information but
                    cannot alter secured SIM numbers.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ sim }) {
  const active =
    sim.status === "Active" && sim.isOnline;
  const lowBalance =
    sim.status === "Low Balance" ||
    sim.balance < 1000;

  const className = active
    ? "bg-green-500/10 text-green-400"
    : lowBalance
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-red-500/10 text-red-400";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${className}`}
    >
      {active ? (
        <CheckCircle size={13} />
      ) : (
        <AlertTriangle size={13} />
      )}

      {sim.status}
    </span>
  );
}

function NetworkLabel({ network }) {
  const normalized = String(
    network || ""
  ).toUpperCase();

  const color =
    normalized === "MTN"
      ? "bg-yellow-400"
      : normalized === "AIRTEL"
        ? "bg-red-500"
        : normalized === "GLO"
          ? "bg-green-500"
          : "bg-emerald-400";

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <div
        className={`h-3 w-3 rounded-full ${color}`}
      />
      <span>{network}</span>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 text-blue-400">
        {icon}
      </div>
      <p className="text-slate-400">
        {title}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold">
        {value}
      </h2>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">
        {label}
      </label>

      <input
        value={value ?? "-"}
        readOnly
        className="mt-2 w-full cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 outline-none"
      />
    </div>
  );
}