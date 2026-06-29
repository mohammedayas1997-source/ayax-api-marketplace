import Link from "next/link";
import {
  Users,
  Wallet,
  Activity,
  Server,
  BarChart3,
  AlertTriangle,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { socket } from "@/lib/socket";
import AdminSidebar from "@/components/AdminSidebar";

const stats = [
  { title: "Total Users", value: "1,248", icon: <Users /> },
  { title: "Total Revenue", value: "₦4,820,500", icon: <Wallet /> },
  { title: "API Calls", value: "842,190", icon: <Activity /> },
  { title: "Failed Transactions", value: "219", icon: <AlertTriangle /> },
];

const links = [
  { name: "Users Management", href: "/admin/users", icon: <Users /> },
  { name: "Pricing Control", href: "/admin/pricing", icon: <Settings /> },
  { name: "Revenue Analytics", href: "/admin/revenue", icon: <BarChart3 /> },
  { name: "API Logs", href: "/admin/logs", icon: <Activity /> },
  { name: "System Health", href: "/admin/health", icon: <Server /> },
];

useEffect(() => {
  socket.connect();

  socket.on("connect", () => {
    console.log("Socket Connected");
  });

  socket.on("funding-request-created", (data) => {
    console.log(data);

    fetchFundingRequests();
  });

  socket.on("refund-request-created", () => {
    fetchRefundRequests();
  });

  socket.on("support-ticket-created", () => {
    fetchTickets();
  });

  socket.on("purchase-successful", () => {
    fetchTransactions();
  });

  return () => {
    socket.off("funding-request-created");
    socket.off("refund-request-created");
    socket.off("support-ticket-created");
    socket.off("purchase-successful");

    socket.disconnect();
  };
}, []);

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="admin" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 text-blue-400 mb-3">
              <ShieldCheck />
              <span className="font-semibold">Super Admin Control Panel</span>
            </div>

            <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>

            <p className="text-slate-400 mt-2">
              Monitor users, revenue, API usage, pricing and system health.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {stats.map((item) => (
              <div
                key={item.title}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
              >
                <div className="text-blue-400 mb-5">{item.icon}</div>
                <p className="text-slate-400">{item.title}</p>
                <h2 className="text-3xl font-extrabold mt-2">
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <section className="mt-8 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-3xl p-6 transition"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-5">
                  {item.icon}
                </div>

                <h2 className="text-xl font-bold">{item.name}</h2>

                <p className="text-slate-400 mt-3">
                  Open and manage {item.name.toLowerCase()}.
                </p>
              </Link>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}