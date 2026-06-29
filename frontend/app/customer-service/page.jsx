"use client";

import { socket } from "@/lib/socket";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  ReceiptText,
  AlertTriangle,
  CheckCircle,
  Ticket,
  Send,
  Eye,
  RefreshCcw,
  LogOut,
  Headphones,
  ShieldAlert,
  FileText,
  Activity,
  Menu,
  X,
} from "lucide-react";

const formatNaira = (amount) => `₦${Number(amount).toLocaleString("en-US")}`;

const initialCustomers = [
  {
    id: "CUS-1001",
    name: "Tech Hub Ltd",
    company: "Tech Hub Ltd",
    phone: "08012345678",
    email: "api@techhub.com",
    wallet: 52800,
    status: "Active",
  },
  {
    id: "CUS-1002",
    name: "John Developer",
    company: "JohnSoft",
    phone: "08098765432",
    email: "john@company.com",
    wallet: 12500,
    status: "Active",
  },
];

const initialTransactions = [
  {
    ref: "AYAX-TRX-001",
    customerId: "CUS-1001",
    service: "Data Purchase",
    amount: 500,
    status: "Failed",
    issue: "Network timeout",
  },
  {
    ref: "AYAX-TRX-002",
    customerId: "CUS-1002",
    service: "Airtime VTU",
    amount: 1000,
    status: "Successful",
    issue: "None",
  },
];

export default function CustomerServiceDashboard() {
  const [customers] = useState(initialCustomers);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);
  const [message, setMessage] = useState("");
  const [refundRequests, setRefundRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.toLowerCase();

    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [query, customers]);

  const customerTransactions = transactions.filter(
    (trx) => trx.customerId === selectedCustomer.id
  );

  const failedCount = transactions.filter((trx) => trx.status === "Failed").length;

  const addActivity = (action) => {
    setActivities((prev) => [
      {
        id: Date.now(),
        action,
        time: new Date().toLocaleString("en-US"),
      },
      ...prev,
    ]);
  };

  socket.on("support-ticket-created",()=>{
   fetchTickets();
});

socket.on("refund-request-created",()=>{
   fetchRefundRequests();
});

  const createTicket = () => {
    const ticket = {
      id: `TICKET-${Date.now()}`,
      customer: selectedCustomer.company,
      status: "Open",
      issue: "Customer complaint under review",
    };

    setTickets((prev) => [ticket, ...prev]);
    setMessage("Support ticket created successfully.");
    addActivity(`Opened support ticket for ${selectedCustomer.company}`);
  };

  const retryTransaction = (ref) => {
    setTransactions((prev) =>
      prev.map((trx) =>
        trx.ref === ref
          ? { ...trx, status: "Processing", issue: "Retry sent for processing" }
          : trx
      )
    );

    setMessage(`Retry request sent for transaction ${ref}.`);
    addActivity(`Retried failed transaction ${ref}`);
  };

  const verifyCustomer = () => {
    setMessage(`${selectedCustomer.company} profile verified successfully.`);
    addActivity(`Verified customer profile: ${selectedCustomer.company}`);
  };

  const requestRefund = (trx) => {
    const request = {
      id: `REFUND-${Date.now()}`,
      customer: selectedCustomer.company,
      amount: trx.amount,
      trxRef: trx.ref,
      status: "Sent to Admin",
      reason: trx.issue,
      date: new Date().toLocaleString("en-US"),
    };

    setRefundRequests((prev) => [request, ...prev]);
    setMessage("Refund request sent to Admin for approval.");
    addActivity(`Sent refund request to Admin for ${trx.ref}`);
  };

  const handleLogout = () => {
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <CustomerServiceSidebar onLogout={handleLogout} />

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-800">
              <SidebarContent
                onLogout={handleLogout}
                onClose={() => setSidebarOpen(false)}
                mobile
              />
            </div>
          </div>
        )}

        <section className="flex-1 p-6 lg:p-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mb-6 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-2"
          >
            <Menu size={18} />
            Open Menu
          </button>

          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <Headphones />
              <span className="font-semibold">Customer Service Control</span>
            </div>

            <h1 className="text-3xl font-extrabold">
              Customer Service Dashboard
            </h1>

            <p className="text-slate-400 mt-2">
              Search customers, inspect transactions, resolve issues, and send refund requests to Admin.
            </p>
          </div>

          {message && (
            <div className="mb-8 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl px-5 py-4">
              {message}
            </div>
          )}

          <section
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
          >
            <Stat title="Customers" value={customers.length} icon={<Users />} />
            <Stat title="Open Tickets" value={tickets.length} icon={<Ticket />} />
            <Stat
              title="Pending Refunds"
              value={refundRequests.length}
              icon={<ShieldAlert />}
            />
            <Stat title="Failed Trx" value={failedCount} icon={<AlertTriangle />} />
          </section>

          <section className="grid xl:grid-cols-[0.9fr_1.1fr] gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-5">Customer Search</h2>

              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 mb-5">
                <Search size={18} className="text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by company, ID, phone, email..."
                  className="w-full bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-3">
                {results.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full text-left p-4 rounded-2xl border ${
                      selectedCustomer.id === customer.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-blue-500"
                    }`}
                  >
                    <h3 className="font-bold">{customer.company}</h3>
                    <p className="text-sm text-slate-500">
                      {customer.id} • {customer.phone}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5">Customer Profile</h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <ReadOnly label="Customer ID" value={selectedCustomer.id} />
                  <ReadOnly label="Company" value={selectedCustomer.company} />
                  <ReadOnly label="Phone" value={selectedCustomer.phone} />
                  <ReadOnly label="Email" value={selectedCustomer.email} />
                  <ReadOnly
                    label="Wallet"
                    value={formatNaira(selectedCustomer.wallet)}
                  />
                  <ReadOnly label="Status" value={selectedCustomer.status} />
                </div>

                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    onClick={createTicket}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Ticket size={18} />
                    Open Ticket
                  </button>

                  <button
                    onClick={verifyCustomer}
                    className="bg-slate-800 hover:bg-slate-700 px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Verify Customer
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5">
                  Customer Transactions
                </h2>

                <div className="space-y-4">
                  {customerTransactions.map((trx) => (
                    <div
                      key={trx.ref}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h3 className="font-bold">{trx.service}</h3>
                          <p className="text-sm text-slate-500">{trx.ref}</p>
                          <p className="text-sm text-slate-500">
                            Issue: {trx.issue}
                          </p>

                          <span
                            className={`inline-flex mt-3 px-3 py-1 rounded-full text-xs ${
                              trx.status === "Successful"
                                ? "bg-green-500/10 text-green-400"
                                : trx.status === "Processing"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {trx.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setMessage(`Viewing transaction ${trx.ref}`)
                            }
                            className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl"
                          >
                            <Eye size={18} />
                          </button>

                          {trx.status === "Failed" && (
                            <>
                              <button
                                onClick={() => retryTransaction(trx.ref)}
                                className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 p-3 rounded-xl"
                              >
                                <RefreshCcw size={18} />
                              </button>

                              <button
                                onClick={() => requestRefund(trx)}
                                className="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 px-4 py-3 rounded-xl font-semibold flex items-center gap-2"
                              >
                                <Send size={18} />
                                Send Refund Request
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Panel title="Refund Requests" icon={<ShieldAlert />}>
                  {refundRequests.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No refund request sent yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {refundRequests.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                        >
                          <h3 className="font-bold">{item.id}</h3>
                          <p className="text-sm text-slate-500">
                            {item.customer} • {item.trxRef}
                          </p>
                          <p className="text-sm text-yellow-400 mt-1">
                            {item.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Live Activity Logs" icon={<Activity />}>
                  {activities.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                        >
                          <p className="text-sm text-slate-300">{item.action}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function CustomerServiceSidebar({ onLogout }) {
  return (
    <aside className="hidden lg:flex w-72 min-h-screen bg-slate-900 border-r border-slate-800 flex-col">
      <SidebarContent onLogout={onLogout} />
    </aside>
  );
}

function SidebarContent({ onLogout, onClose, mobile = false }) {
  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-10">
        <Link href="/customer-service" className="text-2xl font-extrabold">
          Ayax <span className="text-blue-500">Support</span>
        </Link>

        {mobile && (
          <button onClick={onClose} className="text-slate-400">
            <X size={22} />
          </button>
        )}
      </div>

      <nav className="space-y-3 text-slate-300 flex-1">
        <MenuLink active icon={<Headphones />} label="Dashboard" />
        <MenuLink icon={<Search />} label="Customer Search" />
        <MenuLink icon={<ReceiptText />} label="Transactions" />
        <MenuLink icon={<Ticket />} label="Support Tickets" />
        <MenuLink icon={<ShieldAlert />} label="Refund Requests" />
        <MenuLink icon={<FileText />} label="Reports" />
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-3 rounded-xl"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
}

function MenuLink({ icon, label, active }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
        active ? "bg-blue-600 text-white" : "hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </div>
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

function Panel({ title, icon, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="text-blue-400">{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
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