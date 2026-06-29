"use client";

import { Eye, Edit, Trash2, Ban, CheckCircle } from "lucide-react";

export default function UserActions({
  user,
  onView,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
}) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onView?.(user)} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
        <Eye size={16} />
      </button>

      <button onClick={() => onEdit?.(user)} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
        <Edit size={16} />
      </button>

      {user?.status === "ACTIVE" ? (
        <button onClick={() => onSuspend?.(user)} className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400">
          <Ban size={16} />
        </button>
      ) : (
        <button onClick={() => onActivate?.(user)} className="rounded-lg bg-green-500/10 p-2 text-green-400">
          <CheckCircle size={16} />
        </button>
      )}

      <button onClick={() => onDelete?.(user)} className="rounded-lg bg-red-500/10 p-2 text-red-400">
        <Trash2 size={16} />
      </button>
    </div>
  );
}