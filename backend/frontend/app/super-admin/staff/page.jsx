"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  CircuitBoard,
  PlusCircle,
  Eye,
  Ban,
  CheckCircle,
  RefreshCcw,
  Trash2,
  Activity,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const initialStaff = [
  {
    id: "STF-1001",
    name: "GSM Gateway Staff",
    email: "gsm@ayaxdigital.solutions",
    phone: "08055555555",
    role: "STAFF_ADMIN",
    department: "GSM Gateway",
    status: "Active",
    assignedModule: "32 SIM Gateway",
    lastActivity: "Checked SIM balances",
  },
  {
    id: "STF-1002",
    name: "Operations Staff",
    email: "ops@ayaxdigital.solutions",
    phone: "08077777777",
    role: "STAFF_ADMIN",
    department: "Operations",
    status: "Suspended",
    assignedModule: "API Monitoring",
    lastActivity: "Reviewed failed VTU logs",
  },
];

export default function SuperStaffPage() {
  const [staff, setStaff] = useState(initialStaff);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const filteredStaff = useMemo(() => {
    const q = query.toLowerCase();

    return staff.filter((item) => {
      const search =
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const status = statusFilter === "ALL" || item.status === statusFilter;

      return search && status;
    });
  }, [staff, query, statusFilter]);

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.status === "Active").length,
    suspended: staff.filter((s) => s.status === "Suspended").length,
    gsm: staff.filter((s) => s.department === "GSM Gateway").length,
  };

  const createStaff = (data) => {
    const newStaff = {
      id: `STF-${Date.now()}`,
      ...data,
      role: "STAFF_ADMIN",
      status: "Active",
      lastActivity: "New staff created",
    };

    setStaff((prev) => [newStaff, ...prev]);
    setShowCreate(false);
    setMessage("Staff created successfully.");
  };

  const updateStatus = (id, status) => {
    setStaff((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setMessage(`Staff ${status.toLowerCase()} successfully.`);
  };

  const resetPassword = (id) => {
    setMessage(`Password reset link sent for ${id}.`);
  };

  const deleteStaff = (id) => {
    setStaff((prev) => prev.filter((item) => item.id !== id));
    setMessage("Staff deleted successfully.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Staff Admin Management" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Staff" value={stats.total} icon={<Users />} />
            <Stat title="Active Staff" value={stats.active} icon={<UserCheck />} />
            <Stat title="Suspended" value={stats.suspended} icon={<UserX />} />
            <Stat title="GSM Staff" value={stats.gsm} icon={<CircuitBoard />} />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px_180px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search staff by name, email, phone, department or ID..."
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
                Create Staff
              </button>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>Staff</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Department</span>
              <span>Module</span>
              <span>Last Activity</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredStaff.map((item) => (
                <div
                  key={item.id}
                  className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                >
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-xs text-slate-500">{item.id}</p>
                  </div>

                  <span className="text-slate-400 break-all">{item.email}</span>
                  <span className="text-slate-400">{item.phone}</span>
                  <span className="text-slate-400">{item.department}</span>
                  <span className="text-slate-400">{item.assignedModule}</span>
                  <span className="text-slate-500 text-sm">{item.lastActivity}</span>

                  <span
                    className={`w-fit px-3 py-1 rounded-full text-xs ${
                      item.status === "Active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {item.status}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedStaff(item)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => resetPassword(item.id)}
                      className="bg-blue-500/10 text-blue-400 p-2 rounded-lg"
                    >
                      <RefreshCcw size={16} />
                    </button>

                    {item.status === "Active" ? (
                      <button
                        onClick={() => updateStatus(item.id, "Suspended")}
                        className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                      >
                        <Ban size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(item.id, "Active")}
                        className="bg-green-500/10 text-green-400 p-2 rounded-lg"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => deleteStaff(item.id)}
                      className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {selectedStaff && (
            <StaffProfileModal
              staff={selectedStaff}
              onClose={() => setSelectedStaff(null)}
            />
          )}

          {showCreate && (
            <CreateStaffModal
              onClose={() => setShowCreate(false)}
              onCreate={createStaff}
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

function StaffProfileModal({ staff, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">Staff Profile</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ReadOnly label="Staff ID" value={staff.id} />
          <ReadOnly label="Name" value={staff.name} />
          <ReadOnly label="Email" value={staff.email} />
          <ReadOnly label="Phone" value={staff.phone} />
          <ReadOnly label="Department" value={staff.department} />
          <ReadOnly label="Assigned Module" value={staff.assignedModule} />
          <ReadOnly label="Status" value={staff.status} />
          <ReadOnly label="Last Activity" value={staff.lastActivity} />
        </div>

        <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="text-blue-400" />
            <h3 className="font-bold">Activity Summary</h3>
          </div>
          <p className="text-slate-400">
            Staff activity, GSM actions, module access logs and audit history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

function CreateStaffModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    department: "GSM Gateway",
    assignedModule: "32 SIM Gateway",
  });

  const submit = () => {
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required");
      return;
    }

    onCreate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">Create Staff Admin</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />

          <Select
            label="Department"
            value={form.department}
            onChange={(v) => setForm({ ...form, department: v })}
            options={["GSM Gateway", "Operations", "API Monitoring", "Technical Support"]}
          />

          <Select
            label="Assigned Module"
            value={form.assignedModule}
            onChange={(v) => setForm({ ...form, assignedModule: v })}
            options={["32 SIM Gateway", "API Monitoring", "VTU Operations", "System Monitoring"]}
          />
        </div>

        <button
          onClick={submit}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold"
        >
          Create Staff
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

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
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