"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSkeleton from "../components/LoadingSkeleton";
import UserSearch from "./components/UserSearch";
import UserFilters from "./components/UserFilters";
import UsersTable from "./components/UsersTable";
import UserStats from "./components/UserStats";
import UserProfileModal from "./components/UserProfileModal";
import api from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (role !== "ALL") params.role = role;
      if (status !== "ALL") params.status = status;

      const res = await api.get("/users", { params });
      setUsers(res.data.users || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [role, status]);

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "ACTIVE").length,
    suspendedUsers: users.filter((u) => u.status === "SUSPENDED").length,
    admins: users.filter((u) =>
      ["SUPER_ADMIN", "ADMIN", "STAFF_ADMIN"].includes(u.role)
    ).length,
  };

  const changeStatus = async (user, nextStatus) => {
    try {
      await api.patch(`/users/${user.id}/status`, { status: nextStatus });
      setMessage(`User ${nextStatus.toLowerCase()} successfully.`);
      loadUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update user.");
    }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Delete ${user.name}?`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      setMessage("User deleted successfully.");
      loadUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete user.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Users Management">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Users Management"
      description="Manage customers, admins, customer service and staff accounts."
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-300">
          {message}
        </div>
      )}

      <div className="mb-8">
        <UserStats stats={stats} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_auto]">
        <UserSearch
          value={search}
          onChange={setSearch}
          onSearch={loadUsers}
          onClear={() => {
            setSearch("");
            setTimeout(loadUsers, 0);
          }}
        />

        <UserFilters
          role={role}
          status={status}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />
      </div>

      <UsersTable
        users={users}
        onView={setSelectedUser}
        onSuspend={(user) => changeStatus(user, "SUSPENDED")}
        onActivate={(user) => changeStatus(user, "ACTIVE")}
        onDelete={deleteUser}
      />

      <UserProfileModal
        open={!!selectedUser}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </DashboardLayout>
  );
}