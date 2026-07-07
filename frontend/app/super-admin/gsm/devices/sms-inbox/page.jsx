"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCcw, Search } from "lucide-react";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

export default function SmsInboxPage() {
  const [smsList, setSmsList] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gateway/incoming-sms");
      setSmsList(res.data.sms || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load incoming SMS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSms();

    socket.connect();

    socket.on("gsm-sms-received", () => {
      loadSms();
    });

    return () => {
      socket.off("gsm-sms-received");
      socket.disconnect();
    };
  }, []);

  const filtered = smsList.filter((item) => {
    const q = query.toLowerCase();

    return (
      item.phoneNumber?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q) ||
      item.device?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <SuperAdminLayout
      title="Incoming SMS Inbox"
      description="View SMS received by Android GSM Gateway devices in real time."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-6 grid lg:grid-cols-[1fr_180px] gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
          <Search size={18} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phone, message, device..."
            className="w-full bg-transparent py-4 outline-none"
          />
        </div>

        <button
          onClick={loadSms}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="hidden xl:grid grid-cols-5 gap-4 border-b border-slate-800 px-6 py-4 text-sm text-slate-400 font-semibold">
          <span>Device</span>
          <span>From</span>
          <span>Message</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="p-8 text-slate-400">Loading SMS...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-slate-500">No incoming SMS found.</div>
        ) : (
          filtered.map((sms) => (
            <div
              key={sms.id}
              className="grid xl:grid-cols-5 gap-4 border-b border-slate-800 px-6 py-5 items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold">{sms.device?.name || "Gateway Device"}</h3>
                  <p className="text-xs text-slate-500">{sms.deviceId}</p>
                </div>
              </div>

              <span className="text-slate-300">{sms.phoneNumber}</span>

              <p className="text-slate-300 leading-6">{sms.message}</p>

              <span className="text-slate-400">
                {sms.createdAt ? new Date(sms.createdAt).toLocaleString() : "-"}
              </span>

              <span className="w-fit rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-400">
                RECEIVED
              </span>
            </div>
          ))
        )}
      </div>
    </SuperAdminLayout>
  );
}