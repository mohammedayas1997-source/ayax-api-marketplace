"use client";

import { useState, useEffect } from "react";
import {
  User,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({
    name: "Super Admin",
    email: "superadmin@ayaxdigital.solutions",
    role: "SUPER_ADMIN",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3"
      >
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold">
          {user.name?.charAt(0) || "S"}
        </div>

        <div className="hidden md:block text-left">
          <p className="font-semibold text-sm">{user.name}</p>
          <p className="text-xs text-slate-500">{user.role}</p>
        </div>

        <ChevronDown size={16} className="text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <p className="font-bold">{user.name}</p>
            <p className="text-sm text-slate-500 mt-1 break-all">
              {user.email}
            </p>
          </div>

          <MenuItem icon={<User size={18} />} label="Profile" />
          <MenuItem icon={<ShieldCheck size={18} />} label="Security" />
          <MenuItem icon={<Settings size={18} />} label="Settings" />

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label }) {
  return (
    <button className="w-full flex items-center gap-3 px-5 py-4 text-slate-300 hover:bg-slate-800">
      {icon}
      {label}
    </button>
  );
}