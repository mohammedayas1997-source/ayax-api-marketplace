"use client";

import { useState } from "react";
import {
  Bell,
  Wallet,
  RefreshCcw,
  Tags,
  Users,
  CircuitBoard,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";

const initialNotifications = [
  {
    id: 1,
    title: "Wallet Funding",
    message: "Tech Hub Ltd funded ₦50,000 successfully.",
    type: "wallet",
    time: "Just now",
  },
  {
    id: 2,
    title: "Refund Request",
    message: "Customer Service submitted refund request.",
    type: "refund",
    time: "3 mins ago",
  },
  {
    id: 3,
    title: "Price Updated",
    message: "MTN SME 1GB plan updated.",
    type: "pricing",
    time: "8 mins ago",
  },
  {
    id: 4,
    title: "New Customer",
    message: "JohnSoft registered successfully.",
    type: "user",
    time: "15 mins ago",
  },
  {
    id: 5,
    title: "SIM Alert",
    message: "SIM 12 balance is below ₦500.",
    type: "gsm",
    time: "20 mins ago",
  },
];

export default function RealtimeNotificationCenter() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-blue-400" />
          <h2 className="text-xl font-bold">
            Live Notification Center
          </h2>
        </div>

        <button
          onClick={clearAll}
          className="text-red-400 text-sm hover:text-red-300"
        >
          Clear All
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="p-10 text-center">
          <Bell
            className="mx-auto text-slate-700 mb-4"
            size={50}
          />

          <p className="text-slate-500">
            No live notifications.
          </p>
        </div>
      ) : (
        <div className="max-h-[650px] overflow-y-auto">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="border-b border-slate-800 p-5 hover:bg-slate-800/40 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <NotificationIcon type={item.type} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">
                      {item.title}
                    </h3>

                    <button
                      onClick={() =>
                        removeNotification(item.id)
                      }
                    >
                      <X
                        size={18}
                        className="text-slate-500 hover:text-red-400"
                      />
                    </button>
                  </div>

                  <p className="text-slate-400 mt-2">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <CheckCircle
                      size={14}
                      className="text-green-400"
                    />

                    <span className="text-xs text-slate-500">
                      {item.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationIcon({ type }) {
  switch (type) {
    case "wallet":
      return <Wallet size={22} />;

    case "refund":
      return <RefreshCcw size={22} />;

    case "pricing":
      return <Tags size={22} />;

    case "user":
      return <Users size={22} />;

    case "gsm":
      return <CircuitBoard size={22} />;

    case "warning":
      return <AlertTriangle size={22} />;

    default:
      return <Bell size={22} />;
  }
}