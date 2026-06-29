"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  LockKeyhole,
  PlusCircle,
  Eye,
  Ban,
  CheckCircle,
  RefreshCcw,
  Trash2,
  KeyRound,
  Activity,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const initialAdmins = [
  {
    id: "ADM-1001",
    name: "Main Admin",
    email: "admin@ayaxdigital.solutions",
    phone: "08161444444",
    role: "ADMIN",
    status: "Active",
    pinStatus: "Set",
    lastLogin: "Today 09:15 AM",
    permissions: ["Users", "Wallet", "Refund", "Pricing", "Funding"],
  },
  {
    id: "ADM-1002",
    name: "Finance Admin",
    email: "finance@ayaxdigital.solutions",
    phone: "08012345678",
    role: "ADMIN",
    status: "Suspended",
    pinStatus: "Not Set",
    lastLogin: "Yesterday 04:30 PM",
    permissions: ["Wallet", "Funding", "Refund"],
  },
];

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState(initialAdmins);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const filteredAdmins = useMemo(() => {
    const q = query.toLowerCase();

    return admins.filter((admin) => {
      const search =
        admin.name.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        admin.phone.includes(q) ||
        admin.id.toLowerCase().includes(q);

      const status =
        statusFilter === "ALL" || admin.status === statusFilter;

      return search && status;
    });
  }, [admins, query, statusFilter]);

  const stats = {
    total: admins.length,
    active: admins.filter((a) => a.status === "Active").length,
    suspended: admins.filter((a) => a.status === "Suspended").length,
    pinSet: admins.filter((a) => a.pinStatus === "Set").length,
  };

  const createAdmin = (data) => {
    const newAdmin = {
      id: `ADM-${Date.now()}`,
      ...data,
      role: "ADMIN",
      status: "Active",
      pinStatus: data.pin ? "Set" : "Not Set",
      lastLogin: "Never",
      permissions: data.permissions,
    };

    setAdmins((prev) => [newAdmin, ...prev]);
    setShowCreate(false);
    setMessage("Admin created successfully.");
  };

  const updateStatus = (id, status) => {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id ? { ...admin, status } : admin
      )
    );
    setMessage(`Admin ${status.toLowerCase()} successfully.`);
  };

  const resetPassword = (id) => {
    setMessage(`Password reset link sent for ${id}.`);
  };

  const resetPin = (id) => {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id ? { ...admin, pinStatus: "Reset Required" } : admin
      )
    );
    setMessage(`PIN reset required for ${id}.`);
  };

  const deleteAdmin = (id) => {
    setAdmins((prev) => prev.filter((admin) => admin.id !== id));
    setMessage("Admin deleted successfully.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Admin Management" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Admins" value={stats.total} icon={<ShieldCheck />} />
            <Stat title="Active Admins" value={stats.active} icon={<UserCheck />} />
            <Stat title="Suspended" value={stats.suspended} icon={<UserX />} />
            <Stat title="PIN Set" value={stats.pinSet} icon={<LockKeyhole />} />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search admin by name, email, phone or ID..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>

              <button
                onClick={() => setShowCreate(true)}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <PlusCircle size={18} />
                Create Admin
              </button>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>Admin</span>
              <span>Email</span>
              <span>Phone</span>
              <span>PIN</span>
              <span>Last Login</span>
              <span>Permissions</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                >
                  <div>
                    <h3 className="font-bold">{admin.name}</h3>
                    <p className="text-xs text-slate-500">{admin.id}</p>
                  </div>

                  <span className="text-slate-400 break-all">{admin.email}</span>
                  <span className="text-slate-400">{admin.phone}</span>

                  <span
                    className={`w-fit px-3 py-1 rounded-full text-xs ${
                      admin.pinStatus === "Set"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {admin.pinStatus}
                  </span>

                  <span className="text-slate-400 text-sm">{admin.lastLogin}</span>

                  <span className="text-slate-400 text-sm">
                    {admin.permissions.length} permissions
                  </span>

                  <span
                    className={`w-fit px-3 py-1 rounded-full text-xs ${
                      admin.status === "Active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {admin.status}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedAdmin(admin)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => resetPassword(admin.id)}
                      className="bg-blue-500/10 text-blue-400 p-2 rounded-lg"
                    >
                      <RefreshCcw size={16} />
                    </button>

                    <button
                      onClick={() => resetPin(admin.id)}
                      className="bg-yellow-500/10 text-yellow-400 p-2 rounded-lg"
                    >
                      <KeyRound size={16} />
                    </button>

                    {admin.status === "Active" ? (
                      <button
                        onClick={() => updateStatus(admin.id, "Suspended")}
                        className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                      >
                        <Ban size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(admin.id, "Active")}
                        className="bg-green-500/10 text-green-400 p-2 rounded-lg"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => deleteAdmin(admin.id)}
                      className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {selectedAdmin && (
            <AdminProfileModal
              admin={selectedAdmin}
              onClose={() => setSelectedAdmin(null)}
            />
          )}

          {showCreate && (
            <CreateAdminModal
              onClose={() => setShowCreate(false)}
              onCreate={createAdmin}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="text-blue-400 mb-4">{icon}</div>
      <p className="text-slate-400">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function AdminProfileModal({ admin, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">Admin Profile</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ReadOnly label="Admin ID" value={admin.id} />
          <ReadOnly label="Name" value={admin.name} />
          <ReadOnly label="Email" value={admin.email} />
          <ReadOnly label="Phone" value={admin.phone} />
          <ReadOnly label="PIN Status" value={admin.pinStatus} />
          <ReadOnly label="Last Login" value={admin.lastLogin} />
          <ReadOnly label="Status" value={admin.status} />
          <ReadOnly label="Role" value={admin.role} />
        </div>

        <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-blue-400" />
            <h3 className="font-bold">Permissions</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {admin.permissions.map((item) => (
              <span
                key={item}
                className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAdminModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    pin: "",
    permissions: [],
  });

  const permissions = [
    "Users",
    "Wallet",
    "Refund",
    "Funding",
    "Pricing",
    "GSM Gateway",
    "Analytics",
    "Audit Logs",
    "Settings",
  ];

  const togglePermission = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const submit = () => {
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required");
      return;
    }

    onCreate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">Create Admin</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <Input label="Transaction PIN" type="password" value={form.pin} onChange={(v) => setForm({ ...form, pin: v })} />
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-4">Permissions</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {permissions.map((permission) => (
              <button
                key={permission}
                onClick={() => togglePermission(permission)}
                className={`px-4 py-3 rounded-xl border text-left ${
                  form.permissions.includes(permission)
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                {permission}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold"
        >
          Create Admin
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      />
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <input
        value={value}
        readOnly
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none cursor-not-allowed"
      />
    </div>
  );
}