"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import LoadingSkeleton from "../components/LoadingSkeleton";

import UserSearch from "./components/UserSearch";
import UserFilters from "./components/UserFilters";
import UsersTable from "./components/UsersTable";
import UserStats from "./components/UserStats";
import UserProfileModal from "./components/UserProfileModal";

import api from "@/lib/api";
import useGatewaySocket from "@/hooks/useGatewaySocket";

const extractUsers = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.users)) {
    return payload.data.users;
  }

  if (Array.isArray(payload?.users?.users)) {
    return payload.users.users;
  }

  if (Array.isArray(payload?.result?.users)) {
    return payload.result.users;
  }

  return [];
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const params = {};

      const normalizedSearch = String(search || "").trim();

      if (normalizedSearch) {
        params.search = normalizedSearch;
      }

      if (role !== "ALL") {
        params.role = role;
      }

      if (status !== "ALL") {
        params.status = status;
      }

      const response = await api.get("/users", {
        params,
      });

      console.log(
  "USERS API RESPONSE:",
  response.data
);

      const normalizedUsers = extractUsers(response.data);

      setUsers(normalizedUsers);

      if (
        response.data?.success === false &&
        response.data?.message
      ) {
        setMessage(response.data.message);
      }
    } catch (error) {
      console.error("Load users error:", {
        status: error?.response?.status,
        response: error?.response?.data,
        message: error?.message,
      });

      setUsers([]);

      setMessage(
        error?.userMessage ||
          error?.response?.data?.message ||
          "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useGatewaySocket({
    "wallet-updated": loadUsers,
    "gsm-command-updated": loadUsers,
    "transaction-updated": loadUsers,
  });

  const stats = useMemo(() => {
    const safeUsers = Array.isArray(users)
      ? users
      : [];

    return {
      totalUsers: safeUsers.length,

      activeUsers: safeUsers.filter(
        (user) =>
          String(user?.status || "").toUpperCase() ===
          "ACTIVE"
      ).length,

      suspendedUsers: safeUsers.filter(
        (user) =>
          String(user?.status || "").toUpperCase() ===
          "SUSPENDED"
      ).length,

      admins: safeUsers.filter((user) =>
        [
          "SUPER_ADMIN",
          "ADMIN",
          "STAFF_ADMIN",
        ].includes(
          String(user?.role || "").toUpperCase()
        )
      ).length,
    };
  }, [users]);

  const changeStatus = async (
    user,
    nextStatus
  ) => {
    if (!user?.id) {
      setMessage("Invalid user record.");
      return;
    }

    try {
      setMessage("");

      await api.patch(
        `/users/${user.id}/status`,
        {
          status: nextStatus,
        }
      );

      setMessage(
        `User ${String(nextStatus).toLowerCase()} successfully.`
      );

      await loadUsers();
    } catch (error) {
      setMessage(
        error?.userMessage ||
          error?.response?.data?.message ||
          "Failed to update user."
      );
    }
  };

  const deleteUser = async (user) => {
    if (!user?.id) {
      setMessage("Invalid user record.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.name || "this user"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");

      await api.delete(
        `/users/${user.id}`
      );

      setMessage(
        "User deleted successfully."
      );

      if (
        selectedUser?.id === user.id
      ) {
        setSelectedUser(null);
      }

      await loadUsers();
    } catch (error) {
      setMessage(
        error?.userMessage ||
          error?.response?.data?.message ||
          "Failed to delete user."
      );
    }
  };

  const clearSearch = () => {
    setSearch("");
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
          onClear={clearSearch}
        />

        <UserFilters
          role={role}
          status={status}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />
      </div>

      <UsersTable
        users={
          Array.isArray(users)
            ? users
            : []
        }
        onView={setSelectedUser}
        onSuspend={(user) =>
          changeStatus(
            user,
            "SUSPENDED"
          )
        }
        onActivate={(user) =>
          changeStatus(
            user,
            "ACTIVE"
          )
        }
        onDelete={deleteUser}
      />

      <UserProfileModal
        open={Boolean(selectedUser)}
        user={selectedUser}
        onClose={() =>
          setSelectedUser(null)
        }
      />
    </DashboardLayout>
  );
}