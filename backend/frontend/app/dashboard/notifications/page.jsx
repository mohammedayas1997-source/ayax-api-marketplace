"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wallet,
  ShieldCheck,
  RefreshCcw,
  LoaderCircle,
  CheckCheck,
  Trash2,
  AlertCircle,
} from "lucide-react";

import DashboardLayout from "@/components/layouts/DashboardLayout";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const normalizeType = (value) =>
  String(value || "INFO")
    .trim()
    .toUpperCase();

const normalizeStatus = (notification) => {
  if (
    notification?.isRead === true ||
    notification?.read === true ||
    String(notification?.status || "").toUpperCase() === "READ"
  ) {
    return "READ";
  }

  return "UNREAD";
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const fetchNotifications = useCallback(async () => {
    const response = await api.get("/notifications");

    const list =
      response.data?.notifications ||
      response.data?.data?.notifications ||
      response.data?.data ||
      [];

    const normalizedList = Array.isArray(list)
      ? list
      : [];

    setNotifications(normalizedList);

    return normalizedList;
  }, []);

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage("");

        await fetchNotifications();
      } catch (error) {
        setMessageType("error");
        setMessage(
          getErrorMessage(
            error,
            "Unable to load notifications."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchNotifications]
  );

  useEffect(() => {
    loadNotifications();

    const token = localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleNotificationUpdated = () => {
      fetchNotifications().catch(console.error);
    };

    socket.on(
      "notification-created",
      handleNotificationUpdated
    );

    socket.on(
      "notification-updated",
      handleNotificationUpdated
    );

    socket.on(
      "notification-deleted",
      handleNotificationUpdated
    );

    socket.on(
      "wallet-updated",
      handleNotificationUpdated
    );

    socket.on(
      "transaction-updated",
      handleNotificationUpdated
    );

    return () => {
      socket.off(
        "notification-created",
        handleNotificationUpdated
      );

      socket.off(
        "notification-updated",
        handleNotificationUpdated
      );

      socket.off(
        "notification-deleted",
        handleNotificationUpdated
      );

      socket.off(
        "wallet-updated",
        handleNotificationUpdated
      );

      socket.off(
        "transaction-updated",
        handleNotificationUpdated
      );
    };
  }, [
    loadNotifications,
    fetchNotifications,
  ]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const status = normalizeStatus(notification);

      if (filter === "ALL") return true;

      return status === filter;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          normalizeStatus(notification) === "UNREAD"
      ).length,
    [notifications]
  );

  const markAsRead = async (notification) => {
    if (
      normalizeStatus(notification) === "READ"
    ) {
      return;
    }

    try {
      setWorkingId(notification.id);
      setMessage("");

      let response;

      try {
        response = await api.patch(
          `/notifications/${notification.id}/read`
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        response = await api.patch(
          `/notifications/${notification.id}`,
          {
            isRead: true,
          }
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                read: true,
                status: "READ",
              }
            : item
        )
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Notification marked as read."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to update notification."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) {
      setMessageType("info");
      setMessage("All notifications are already read.");
      return;
    }

    try {
      setWorkingId("ALL");
      setMessage("");

      let response;

      try {
        response = await api.patch(
          "/notifications/read-all"
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          throw error;
        }

        response = await api.patch(
          "/notifications/mark-all-read"
        );
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          read: true,
          status: "READ",
        }))
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "All notifications marked as read."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to mark all notifications as read."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  const deleteNotification = async (notification) => {
    const accepted = window.confirm(
      "Delete this notification?"
    );

    if (!accepted) return;

    try {
      setWorkingId(notification.id);
      setMessage("");

      const response = await api.delete(
        `/notifications/${notification.id}`
      );

      setNotifications((current) =>
        current.filter(
          (item) => item.id !== notification.id
        )
      );

      setMessageType("success");
      setMessage(
        response.data?.message ||
          "Notification deleted."
      );
    } catch (error) {
      setMessageType("error");
      setMessage(
        getErrorMessage(
          error,
          "Unable to delete notification."
        )
      );
    } finally {
      setWorkingId("");
    }
  };

  return (
    <DashboardLayout
      title="Notifications"
      description="View wallet, transaction, security and account alerts."
    >
      {message && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
            messageType === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : messageType === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-blue-500/30 bg-blue-500/10 text-blue-300"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{message}</span>
        </div>
      )}

      <section className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          title="Total Notifications"
          value={notifications.length}
          type="total"
        />

        <StatCard
          title="Unread"
          value={unreadCount}
          type="unread"
        />

        <StatCard
          title="Read"
          value={
            notifications.length - unreadCount
          }
          type="read"
        />
      </section>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {["ALL", "UNREAD", "READ"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl px-5 py-3 font-semibold transition ${
                filter === item
                  ? "bg-blue-600 text-white"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              loadNotifications({
                silent: true,
              })
            }
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCcw
              size={18}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={
              unreadCount === 0 ||
              workingId === "ALL"
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {workingId === "ALL" ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <CheckCheck size={18} />
            )}

            Mark All Read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-slate-400">
          <div className="flex items-center gap-3">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            Loading notifications...
          </div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <Bell
            size={44}
            className="mx-auto text-slate-600"
          />

          <h2 className="mt-5 text-xl font-bold">
            No notifications found
          </h2>

          <p className="mt-2 text-slate-400">
            You currently have no notifications
            matching this filter.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {filteredNotifications.map(
            (notification) => {
              const status =
                normalizeStatus(notification);

              const type = normalizeType(
                notification?.type ||
                  notification?.category
              );

              const working =
                workingId === notification.id;

              return (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-5 transition ${
                    status === "UNREAD"
                      ? "border-blue-500/40 bg-blue-500/5"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <NotificationIcon type={type} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold">
                          {notification.title ||
                            notification.subject ||
                            "Notification"}
                        </h2>

                        {status === "UNREAD" && (
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-2 leading-7 text-slate-400">
                        {notification.message ||
                          notification.description ||
                          "-"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                        <span>{type}</span>

                        <span>
                          {notification.createdAt
                            ? new Date(
                                notification.createdAt
                              ).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      {status === "UNREAD" && (
                        <button
                          type="button"
                          onClick={() =>
                            markAsRead(notification)
                          }
                          disabled={working}
                          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {working ? (
                            <LoaderCircle
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2
                              size={17}
                            />
                          )}

                          Mark Read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(
                            notification
                          )
                        }
                        disabled={working}
                        className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}
    </DashboardLayout>
  );
}

function NotificationIcon({ type }) {
  const config = {
    SUCCESS: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle2 size={23} />,
    },
    TRANSACTION: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle2 size={23} />,
    },
    WALLET: {
      classes:
        "bg-blue-500/10 text-blue-400",
      icon: <Wallet size={23} />,
    },
    SECURITY: {
      classes:
        "bg-purple-500/10 text-purple-400",
      icon: <ShieldCheck size={23} />,
    },
    WARNING: {
      classes:
        "bg-yellow-500/10 text-yellow-400",
      icon: <AlertTriangle size={23} />,
    },
    ERROR: {
      classes:
        "bg-red-500/10 text-red-400",
      icon: <AlertTriangle size={23} />,
    },
    INFO: {
      classes:
        "bg-slate-500/10 text-slate-400",
      icon: <Info size={23} />,
    },
  };

  const selected =
    config[type] || config.INFO;

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${selected.classes}`}
    >
      {selected.icon}
    </div>
  );
}

function StatCard({ title, value, type }) {
  const config = {
    total: {
      classes:
        "bg-blue-500/10 text-blue-400",
      icon: <Bell size={22} />,
    },
    unread: {
      classes:
        "bg-yellow-500/10 text-yellow-400",
      icon: <AlertTriangle size={22} />,
    },
    read: {
      classes:
        "bg-green-500/10 text-green-400",
      icon: <CheckCircle2 size={22} />,
    },
  };

  const selected = config[type];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selected.classes}`}
      >
        {selected.icon}
      </div>

      <p className="mt-5 text-sm text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}