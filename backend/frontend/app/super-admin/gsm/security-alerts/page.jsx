"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  RefreshCcw,
  CheckCircle,
  Smartphone,
} from "lucide-react";

import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/security-alerts");
      setAlerts(res.data.alerts || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id) => {
    try {
      await api.patch(`/gateway/security-alerts/${id}/resolve`);
      setMessage("Alert resolved successfully.");
      loadAlerts();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to resolve alert.");
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useGatewaySocket({
    "gateway-security-alert": loadAlerts,
    "gateway-security-alert-resolved": loadAlerts,
  });

  return (
    <SuperAdminLayout
      title="Gateway Security Alerts"
      description="Monitor charger removal, device movement, location alerts and theft detection events."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          onClick={loadAlerts}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="hidden xl:grid grid-cols-6 gap-4 border-b border-slate-800 px-6 py-4 text-sm text-slate-400 font-semibold">
          <span>Device</span>
          <span>Alert Type</span>
          <span>Message</span>
          <span>Date</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="p-8 text-slate-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-slate-500">No security alerts found.</div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="grid xl:grid-cols-6 gap-4 border-b border-slate-800 px-6 py-5 items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="font-bold">
                    {alert.device?.name || "Gateway Device"}
                  </h3>
                  <p className="text-xs text-slate-500">{alert.deviceId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert size={16} />
                <span className="font-semibold">{alert.type}</span>
              </div>

              <p className="text-slate-300">{alert.message}</p>

              <span className="text-slate-400">
                {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "-"}
              </span>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs ${
                  alert.resolved
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {alert.resolved ? "Resolved" : "Open"}
              </span>

              <button
                disabled={alert.resolved}
                onClick={() => resolveAlert(alert.id)}
                className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Resolve
                </span>
              </button>
            </div>
          ))
        )}
      </div>
    </SuperAdminLayout>
  );
}