"use client";

import {
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
} from "lucide-react";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-US")}`;

const normalizeUsers = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.users)) {
    return value.users;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.users)) {
    return value.data.users;
  }

  return [];
};

export default function UsersTable({
  users = [],
  onView,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
}) {
  const safeUsers = normalizeUsers(users);

  if (safeUsers.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-500">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      <div className="hidden grid-cols-8 gap-4 border-b border-slate-800 px-6 py-4 text-sm font-semibold text-slate-400 xl:grid">
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
        {safeUsers.map((user, index) => {
          const userId =
            user?.id ||
            user?._id ||
            `user-${index}`;

          const userStatus = String(
            user?.status || "UNKNOWN"
          ).toUpperCase();

          return (
            <div
              key={userId}
              className="grid items-center gap-4 px-6 py-5 xl:grid-cols-8"
            >
              <div>
                <h3 className="font-bold">
                  {user?.name || "Unnamed User"}
                </h3>

                <p className="text-xs text-slate-500">
                  {user?.id || "-"}
                </p>
              </div>

              <span className="break-all text-slate-400">
                {user?.email || "-"}
              </span>

              <span className="text-slate-400">
                {user?.phone || "-"}
              </span>

              <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                {user?.role || "CUSTOMER"}
              </span>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs ${
                  userStatus === "ACTIVE"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {userStatus}
              </span>

              <span className="font-semibold">
                {formatNaira(
                  user?.wallet?.balance || 0
                )}
              </span>

              <span className="text-slate-400">
                {user?.createdAt
                  ? new Date(
                      user.createdAt
                    ).toLocaleDateString()
                  : "-"}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onView?.(user)
                  }
                  className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                  aria-label="View user"
                >
                  <Eye size={16} />
                </button>

                {typeof onEdit ===
                  "function" && (
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(user)
                    }
                    className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700"
                    aria-label="Edit user"
                  >
                    <Edit size={16} />
                  </button>
                )}

                {userStatus === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSuspend?.(user)
                    }
                    className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400 hover:bg-yellow-500/20"
                    aria-label="Suspend user"
                  >
                    <Ban size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onActivate?.(user)
                    }
                    className="rounded-lg bg-green-500/10 p-2 text-green-400 hover:bg-green-500/20"
                    aria-label="Activate user"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    onDelete?.(user)
                  }
                  className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                  aria-label="Delete user"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}