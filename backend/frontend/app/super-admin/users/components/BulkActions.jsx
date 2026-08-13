"use client";

import {
  Trash2,
  Ban,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

export default function BulkActions({
  selectedUsers = [],
  onDelete,
  onSuspend,
  onActivate,
  onRoleChange,
}) {
  const count = selectedUsers.length;

  if (count === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
      <div>
        <h3 className="font-semibold text-white">
          {count} user{count > 1 ? "s" : ""} selected
        </h3>

        <p className="text-sm text-slate-400">
          Perform bulk actions on selected users.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onActivate}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          <CheckCircle size={16} />
          Activate
        </button>

        <button
          onClick={onSuspend}
          className="flex items-center gap-2 rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium hover:bg-yellow-700"
        >
          <Ban size={16} />
          Suspend
        </button>

        <button
          onClick={() => onRoleChange?.()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          <ShieldCheck size={16} />
          Change Role
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
}