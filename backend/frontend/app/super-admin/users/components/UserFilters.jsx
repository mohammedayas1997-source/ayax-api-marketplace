"use client";

export default function UserFilters({
  role = "ALL",
  status = "ALL",
  onRoleChange,
  onStatusChange,
}) {
  return (
    <div className="flex flex-wrap gap-4">
      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Role
        </label>

        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF_ADMIN">Staff Admin</option>
          <option value="CUSTOMER_SERVICE">Customer Service</option>
          <option value="CUSTOMER">Customer</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-400">
          Status
        </label>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>
    </div>
  );
}