"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Headphones,
  UserCheck,
  UserX,
  Ticket,
  PlusCircle,
  Eye,
  Ban,
  CheckCircle,
  RefreshCcw,
  Trash2,
  ShieldAlert,
} from "lucide-react";

import SuperSidebar from "../components/SuperSidebar";
import SuperTopbar from "../components/SuperTopbar";

const initialAgents = [
  {
    id: "CS-1001",
    name: "Support Agent One",
    email: "support1@ayaxdigital.solutions",
    phone: "08012345678",
    status: "Active",
    openTickets: 12,
    resolvedTickets: 89,
    refundRequests: 4,
    lastActivity: "Sent refund request to admin",
  },
  {
    id: "CS-1002",
    name: "Support Agent Two",
    email: "support2@ayaxdigital.solutions",
    phone: "08098765432",
    status: "Suspended",
    openTickets: 3,
    resolvedTickets: 45,
    refundRequests: 1,
    lastActivity: "Verified customer complaint",
  },
];

export default function SuperCustomerServicePage() {
  const [agents, setAgents] = useState(initialAgents);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const filteredAgents = useMemo(() => {
    const q = query.toLowerCase();

    return agents.filter((agent) => {
      const search =
        agent.name.toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        agent.phone.includes(q) ||
        agent.id.toLowerCase().includes(q);

      const status = statusFilter === "ALL" || agent.status === statusFilter;

      return search && status;
    });
  }, [agents, query, statusFilter]);

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === "Active").length,
    suspended: agents.filter((a) => a.status === "Suspended").length,
    tickets: agents.reduce((sum, a) => sum + a.openTickets, 0),
  };

  const createAgent = (data) => {
    const newAgent = {
      id: `CS-${Date.now()}`,
      ...data,
      status: "Active",
      openTickets: 0,
      resolvedTickets: 0,
      refundRequests: 0,
      lastActivity: "New customer service created",
    };

    setAgents((prev) => [newAgent, ...prev]);
    setShowCreate(false);
    setMessage("Customer service agent created successfully.");
  };

  const updateStatus = (id, status) => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, status } : agent))
    );
    setMessage(`Customer service agent ${status.toLowerCase()} successfully.`);
  };

  const resetPassword = (id) => {
    setMessage(`Password reset link sent for ${id}.`);
  };

  const deleteAgent = (id) => {
    setAgents((prev) => prev.filter((agent) => agent.id !== id));
    setMessage("Customer service agent deleted successfully.");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <SuperSidebar />

        <section className="flex-1 p-6 lg:p-10">
          <SuperTopbar title="Customer Service Management" />

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Total Agents" value={stats.total} icon={<Headphones />} />
            <Stat title="Active Agents" value={stats.active} icon={<UserCheck />} />
            <Stat title="Suspended" value={stats.suspended} icon={<UserX />} />
            <Stat title="Open Tickets" value={stats.tickets} icon={<Ticket />} />
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
            <div className="grid lg:grid-cols-[1fr_220px_220px] gap-4">
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, phone or ID..."
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
                Create Agent
              </button>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden xl:grid grid-cols-8 gap-4 px-6 py-4 border-b border-slate-800 text-sm text-slate-400 font-semibold">
              <span>Agent</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Open Tickets</span>
              <span>Resolved</span>
              <span>Refund Req.</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
                >
                  <div>
                    <h3 className="font-bold">{agent.name}</h3>
                    <p className="text-xs text-slate-500">{agent.id}</p>
                  </div>

                  <span className="text-slate-400 break-all">{agent.email}</span>
                  <span className="text-slate-400">{agent.phone}</span>
                  <span className="font-bold">{agent.openTickets}</span>
                  <span className="font-bold">{agent.resolvedTickets}</span>
                  <span className="font-bold">{agent.refundRequests}</span>

                  <span
                    className={`w-fit px-3 py-1 rounded-full text-xs ${
                      agent.status === "Active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {agent.status}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => resetPassword(agent.id)}
                      className="bg-blue-500/10 text-blue-400 p-2 rounded-lg"
                    >
                      <RefreshCcw size={16} />
                    </button>

                    {agent.status === "Active" ? (
                      <button
                        onClick={() => updateStatus(agent.id, "Suspended")}
                        className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                      >
                        <Ban size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(agent.id, "Active")}
                        className="bg-green-500/10 text-green-400 p-2 rounded-lg"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => deleteAgent(agent.id)}
                      className="bg-red-500/10 text-red-400 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {selectedAgent && (
            <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
          )}

          {showCreate && (
            <CreateAgentModal
              onClose={() => setShowCreate(false)}
              onCreate={createAgent}
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

function AgentModal({ agent, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">Customer Service Profile</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ReadOnly label="Agent ID" value={agent.id} />
          <ReadOnly label="Name" value={agent.name} />
          <ReadOnly label="Email" value={agent.email} />
          <ReadOnly label="Phone" value={agent.phone} />
          <ReadOnly label="Status" value={agent.status} />
          <ReadOnly label="Last Activity" value={agent.lastActivity} />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <ProfileCard title="Open Tickets" value={agent.openTickets} icon={<Ticket />} />
          <ProfileCard title="Resolved Tickets" value={agent.resolvedTickets} icon={<CheckCircle />} />
          <ProfileCard title="Refund Requests" value={agent.refundRequests} icon={<ShieldAlert />} />
        </div>
      </div>
    </div>
  );
}

function CreateAgentModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
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
          <h2 className="text-2xl font-extrabold">Create Customer Service Agent</h2>
          <button onClick={onClose} className="bg-slate-800 px-4 py-2 rounded-xl">
            Close
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        </div>

        <button
          onClick={submit}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold"
        >
          Create Agent
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

function ProfileCard({ title, value, icon }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
      <div className="text-blue-400 mb-3">{icon}</div>
      <p className="text-slate-400 text-sm">{title}</p>
      <h3 className="text-2xl font-extrabold mt-1">{value}</h3>
    </div>
  );
}