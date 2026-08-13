"use client";

import { useState } from "react";
import {
  Bell,
  CreditCard,
  RefreshCcw,
  Ticket,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const initialNotifications = [
  {
    id: 1,
    title: "New Funding Request",
    desc: "Tech Hub Ltd submitted ₦50,000 funding.",
    type: "funding",
    time: "Just now",
  },
  {
    id: 2,
    title: "Refund Request",
    desc: "Customer Service sent a refund request.",
    type: "refund",
    time: "5 mins ago",
  },
  {
    id: 3,
    title: "Low SIM Balance",
    desc: "SIM 12 balance is below ₦1,000.",
    type: "alert",
    time: "12 mins ago",
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifications([]);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-slate-900 border border-slate-800 p-3 rounded-2xl"
      >
        <Bell size={20} className="text-blue-400" />

        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white">Notifications</h3>

            <button
              onClick={markAllRead}
              className="text-blue-400 text-sm font-semibold"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No new notifications.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-5 border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
                      <NotificationIcon type={item.type} />
                    </div>

                    <div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">
                        {item.desc}
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        {item.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationIcon({ type }) {
  if (type === "funding") return <CreditCard size={18} />;
  if (type === "refund") return <RefreshCcw size={18} />;
  if (type === "ticket") return <Ticket size={18} />;
  if (type === "alert") return <AlertTriangle size={18} />;
  return <CheckCircle size={18} />;
}