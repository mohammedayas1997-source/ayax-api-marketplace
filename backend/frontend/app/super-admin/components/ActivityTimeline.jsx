"use client";

import {
  LogIn,
  Wallet,
  RefreshCcw,
  Tags,
  CircuitBoard,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

const activities = [
  {
    id: 1,
    title: "Admin Login",
    desc: "Main Admin logged in successfully.",
    type: "auth",
    time: "Just now",
  },
  {
    id: 2,
    title: "Funding Approved",
    desc: "₦50,000 wallet funding approved for Tech Hub Ltd.",
    type: "wallet",
    time: "5 mins ago",
  },
  {
    id: 3,
    title: "Refund Request",
    desc: "Customer Service submitted a refund request.",
    type: "refund",
    time: "12 mins ago",
  },
  {
    id: 4,
    title: "Price Updated",
    desc: "MTN SME 1GB price was updated.",
    type: "pricing",
    time: "20 mins ago",
  },
  {
    id: 5,
    title: "SIM Recharge",
    desc: "SIM 12 was recharged with ₦5,000.",
    type: "gsm",
    time: "30 mins ago",
  },
];

export default function ActivityTimeline() {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h2 className="text-xl font-bold mb-6">Activity Timeline</h2>

      <div className="space-y-5">
        {activities.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="w-11 h-11 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
              <ActivityIcon type={item.type} />
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{item.title}</h3>
                <span className="text-xs text-slate-500">{item.time}</span>
              </div>

              <p className="text-sm text-slate-400 mt-2">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityIcon({ type }) {
  if (type === "auth") return <LogIn size={18} />;
  if (type === "wallet") return <Wallet size={18} />;
  if (type === "refund") return <RefreshCcw size={18} />;
  if (type === "pricing") return <Tags size={18} />;
  if (type === "gsm") return <CircuitBoard size={18} />;
  if (type === "security") return <ShieldAlert size={18} />;
  return <UserCheck size={18} />;
}