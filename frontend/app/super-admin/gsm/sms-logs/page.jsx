"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";

import DashboardLayout from "../../components/DashboardLayout";
import api from "@/lib/api";

export default function SmsLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const res = await api.get("/gsm/sms-logs");

      setLogs(
        res.data.logs ||
        res.data.smsLogs ||
        res.data.data ||
        []
      );
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const badge = (status) => {
    const s = String(status || "").toUpperCase();

    if (["SUCCESS", "SENT"].includes(s))
      return {
        color: "text-green-400",
        icon: <CheckCircle2 size={15} />,
      };

    if (["FAILED", "ERROR"].includes(s))
      return {
        color: "text-red-400",
        icon: <XCircle size={15} />,
      };

    return {
      color: "text-yellow-400",
      icon: <Clock3 size={15} />,
    };
  };

  return (
    <DashboardLayout
      title="SMS Logs"
      description="Outgoing and incoming SMS history"
    >
      <div className="flex justify-end mb-6">
        <button
          onClick={loadLogs}
          className="bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-3 flex items-center gap-2"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-950">
            <tr>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Phone</th>
              <th className="p-4 text-left">Message</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="4"
                  className="text-center p-10"
                >
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="text-center p-10"
                >
                  <MessageSquare
                    className="mx-auto mb-3"
                    size={40}
                  />
                  No SMS logs found.
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const b = badge(log.status);

                return (
                  <tr
                    key={log.id || index}
                    className="border-t border-slate-800"
                  >
                    <td className="p-4">
                      {new Date(
                        log.createdAt ||
                          log.timestamp
                      ).toLocaleString()}
                    </td>

                    <td className="p-4">
                      {log.phone ||
                        log.phoneNumber}
                    </td>

                    <td className="p-4">
                      {log.message}
                    </td>

                    <td
                      className={`p-4 flex items-center gap-2 ${b.color}`}
                    >
                      {b.icon}
                      {log.status}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}