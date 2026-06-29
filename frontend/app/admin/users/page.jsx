import {
  Search,
  UserCheck,
  UserX,
  Wallet,
  Shield,
  Eye,
} from "lucide-react";

import AdminSidebar from "@/components/AdminSidebar";

const users = [
  {
    id: 1,
    name: "Abdulrahman Mohammed Ayas",
    email: "admin@ayaxdigital.solutions",
    wallet: "₦125,450",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    name: "John Developer",
    email: "john@company.com",
    wallet: "₦52,200",
    role: "User",
    status: "Active",
  },
  {
    id: 3,
    name: "Tech Hub Ltd",
    email: "api@techhub.com",
    wallet: "₦8,900",
    role: "User",
    status: "Suspended",
  },
];

export default function AdminUsersPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex">
        <AdminSidebar active="users" />

        <section className="flex-1 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold">
                Users Management
              </h1>

              <p className="text-slate-400 mt-2">
                Manage developers, businesses, wallets and permissions.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 flex items-center gap-3">
              <Search size={18} className="text-slate-500" />

              <input
                placeholder="Search users..."
                className="bg-transparent py-4 outline-none text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="hidden lg:grid grid-cols-6 px-6 py-4 border-b border-slate-800 text-slate-400 font-semibold">
              <span>Name</span>
              <span>Email</span>
              <span>Wallet</span>
              <span>Role</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {users.map((user) => (
              <div
                key={user.id}
                className="grid lg:grid-cols-6 gap-4 px-6 py-5 border-b border-slate-800"
              >
                <div className="font-semibold">
                  {user.name}
                </div>

                <div className="text-slate-400 break-all">
                  {user.email}
                </div>

                <div className="font-bold">
                  {user.wallet}
                </div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      user.role === "Admin"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      user.status === "Active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg">
                    <Eye size={16} />
                  </button>

                  <button className="bg-green-500/10 text-green-400 hover:bg-green-500/20 p-2 rounded-lg">
                    <Wallet size={16} />
                  </button>

                  <button className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 p-2 rounded-lg">
                    <Shield size={16} />
                  </button>

                  <button className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-2 rounded-lg">
                    <UserX size={16} />
                  </button>

                  <button className="bg-green-500/10 text-green-400 hover:bg-green-500/20 p-2 rounded-lg">
                    <UserCheck size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}