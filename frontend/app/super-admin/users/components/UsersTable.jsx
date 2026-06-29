"use client";

import { Eye, Edit, Trash2, Ban, CheckCircle } from "lucide-react";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

export default function UsersTable({
  users = [],
  onView,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-500">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      <div className="hidden xl:grid grid-cols-8 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400">
        <span>User</span>
        <span>Email</span>
        <span>Phone</span>
        <span>Role</span>
        <span>Status</span>
        <span>Wallet</span>
        <span>Created</span>
        <span>Actions</span>
      </div>

      <div className="divide-y divide-slate-800">
        {users.map((user) => (
          <div
            key={user.id}
            className="grid xl:grid-cols-8 gap-4 px-6 py-5 items-center"
          >
            <div>
              <h3 className="font-bold">{user.name}</h3>
              <p className="text-xs text-slate-500">{user.id}</p>
            </div>

            <span className="text-slate-400 break-all">{user.email}</span>
            <span className="text-slate-400">{user.phone || "-"}</span>

            <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
              {user.role}
            </span>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs ${
                user.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {user.status}
            </span>

            <span className="font-semibold">
              {formatNaira(user.wallet?.balance || 0)}
            </span>

            <span className="text-slate-400">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "-"}
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => onView?.(user)}
                className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
              >
                <Eye size={16} />
              </button>

              <button
                onClick={() => onEdit?.(user)}
                className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
              >
                <Edit size={16} />
              </button>

              {user.status === "ACTIVE" ? (
                <button
                  onClick={() => onSuspend?.(user)}
                  className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400 hover:bg-yellow-500/20"
                >
                  <Ban size={16} />
                </button>
              ) : (
                <button
                  onClick={() => onActivate?.(user)}
                  className="rounded-lg bg-green-500/10 p-2 text-green-400 hover:bg-green-500/20"
                >
                  <CheckCircle size={16} />
                </button>
              )}

              <button
                onClick={() => onDelete?.(user)}
                className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}