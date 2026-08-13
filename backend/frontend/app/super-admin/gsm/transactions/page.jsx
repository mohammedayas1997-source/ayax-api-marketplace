"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

export default function GsmTransactionsPage() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCommands = async () => {
    try {
      const res = await api.get("/commands");
      setCommands(res.data.commands || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommands();
  }, []);

  useGatewaySocket({
    "gsm-command-updated": loadCommands,
    "transaction-updated": loadCommands,
  });

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">GSM Transactions</h1>

      <div className="overflow-auto rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-3 text-left">Reference</th>
              <th className="p-3 text-left">Device</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Response</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>

          <tbody>
            {commands.map((cmd) => (
              <tr key={cmd.id} className="border-t">
                <td className="p-3 font-semibold">{cmd.reference}</td>
                <td className="p-3">{cmd.device?.name || cmd.deviceId}</td>
                <td className="p-3">{cmd.type}</td>
                <td className="p-3">{cmd.status}</td>
                <td className="p-3">{cmd.response || "-"}</td>
                <td className="p-3">
                  {cmd.createdAt ? new Date(cmd.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}