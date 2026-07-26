"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import api from "@/lib/api";
import { socket } from "@/lib/socket";

/* ======================================================
   CONSTANTS
====================================================== */

const DEFAULT_STATISTICS = {
  totalNotifications: 0,
  sentNotifications: 0,
  scheduledNotifications: 0,
  failedNotifications: 0,
  sentToday: 0,

  totalRecipients: 0,
  delivered: 0,
  read: 0,
  unread: 0,
  clicked: 0,
  failed: 0,

  deliveryRate: 0,
  readRate: 0,
  clickRate: 0,
};

const DEFAULT_FORM = {
  title: "",
  message: "",

  type: "INFO",
  priority: "NORMAL",
  audience: "ALL",

  targetRole: "",
  targetUserId: "",
  targetEmail: "",
  userIds: [],

  actionText: "",
  actionUrl: "",
  imageUrl: "",
};

const TYPE_OPTIONS = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
  "UPDATE",
  "PROMOTION",
  "SYSTEM",
];

const PRIORITY_OPTIONS = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
];

const AUDIENCE_OPTIONS = [
  {
    value: "ALL",
    label: "All Active Users",
    description:
      "Send to every active account on the platform.",
    icon: Users,
  },
  {
    value: "ROLE",
    label: "Specific Role",
    description:
      "Send to all users under one selected role.",
    icon: ShieldAlert,
  },
  {
    value: "USER",
    label: "One User",
    description:
      "Send directly to one account by ID or email.",
    icon: UserRound,
  },
  {
    value: "MULTIPLE_USERS",
    label: "Multiple Users",
    description:
      "Select and send to several accounts.",
    icon: Mail,
  },
];

const ROLE_OPTIONS = [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF_ADMIN",
  "CUSTOMER_SERVICE",
  "CUSTOMER",
];

/* ======================================================
   HELPERS
====================================================== */

const getErrorMessage = (error, fallback) => {
  const apiError = error;

  return (
    apiError?.response?.data?.message ||
    apiError?.message ||
    fallback
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const percentage = (value) =>
  `${Number(value || 0).toFixed(1)}%`;

const getTypeClasses = (type) => {
  switch (type) {
    case "SUCCESS":
      return "border-green-500/20 bg-green-500/10 text-green-400";

    case "WARNING":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400";

    case "ERROR":
      return "border-red-500/20 bg-red-500/10 text-red-400";

    case "PROMOTION":
      return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400";

    case "UPDATE":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";

    case "SYSTEM":
      return "border-violet-500/20 bg-violet-500/10 text-violet-400";

    default:
      return "border-blue-500/20 bg-blue-500/10 text-blue-400";
  }
};

const getPriorityClasses = (priority) => {
  switch (priority) {
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "HIGH":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";

    case "LOW":
      return "border-slate-700 bg-slate-800 text-slate-400";

    default:
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }
};

/* ======================================================
   PAGE
====================================================== */

export default function SuperAdminNotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    statistics,
    setStatistics,
  ] = useState(
    DEFAULT_STATISTICS
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  // Filters are only sent to the API after clicking "Apply Filters".
  // This prevents a full API reload on every search keystroke.
  const [appliedSearch, setAppliedSearch] = useState("");

  const [
    selectedType,
    setSelectedType,
  ] = useState("");

  const [
    selectedPriority,
    setSelectedPriority,
  ] = useState("");

  const [
    selectedAudience,
    setSelectedAudience,
  ] = useState("");

  const [appliedType, setAppliedType] = useState("");
  const [appliedPriority, setAppliedPriority] = useState("");
  const [appliedAudience, setAppliedAudience] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalItems,
    setTotalItems,
  ] = useState(0);

  const [
    composeOpen,
    setComposeOpen,
  ] = useState(false);

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  const [
    selectedNotification,
    setSelectedNotification,
  ] =
    useState(
      null
    );

  const [
    form,
    setForm,
  ] = useState(
    DEFAULT_FORM
  );

  const [
    userSearch,
    setUserSearch,
  ] = useState("");

  const [
    userSearchLoading,
    setUserSearchLoading,
  ] = useState(false);

  const [
    userSearchResults,
    setUserSearchResults,
  ] = useState([]);

  const [
    selectedUsers,
    setSelectedUsers,
  ] = useState([]);

  /* ====================================================
     FETCH STATISTICS
  ==================================================== */

  const fetchStatistics =
    useCallback(async () => {
      const response =
        await api.get(
          "/admin/notifications/statistics"
        );

      const nextStatistics =
        response.data?.statistics ||
        response.data?.data ||
        DEFAULT_STATISTICS;

      setStatistics({
        ...DEFAULT_STATISTICS,
        ...nextStatistics,
      });
    }, []);

  /* ====================================================
     FETCH HISTORY
  ==================================================== */

  const fetchHistory =
    useCallback(async () => {
      const params = {
        page: currentPage,
        limit: 12,
      };

      if (appliedSearch) {
        params.search = appliedSearch;
      }

      if (appliedType) {
        params.type = appliedType;
      }

      if (appliedPriority) {
        params.priority = appliedPriority;
      }

      if (appliedAudience) {
        params.audience = appliedAudience;
      }

      const response =
        await api.get(
          "/admin/notifications/history",
          {
            params,
          }
        );

      const history =
        response.data?.notifications ||
        response.data?.history ||
        [];

      const pagination =
        response.data?.pagination ||
        {};

      setNotifications(
        Array.isArray(history)
          ? history
          : []
      );

      setTotalPages(
        Number(
          pagination.totalPages || 1
        )
      );

      setTotalItems(
        Number(
          pagination.total || 0
        )
      );
    }, [
      currentPage,
      appliedSearch,
      appliedType,
      appliedPriority,
      appliedAudience,
    ]);

  /* ====================================================
     LOAD PAGE
  ==================================================== */

  const loadPage = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const results =
          await Promise.allSettled([
            fetchStatistics(),
            fetchHistory(),
          ]);

        const rejected =
          results.find(
            (result) =>
              result.status ===
              "rejected"
          );

        if (
          rejected &&
          rejected.status ===
            "rejected"
        ) {
          setError(
            getErrorMessage(
              rejected.reason,
              "Unable to load notification center."
            )
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchStatistics,
      fetchHistory,
    ]
  );

  /* ====================================================
     INITIAL LOAD AND SOCKET
  ==================================================== */

  useEffect(() => {
    loadPage();

    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      socket.auth = {
        token,
      };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const refreshNotifications =
      () => {
        loadPage({
          silent: true,
        });
      };

    socket.on(
      "notification-broadcast-created",
      refreshNotifications
    );

    socket.on(
      "notification-deleted",
      refreshNotifications
    );

    return () => {
      socket.off(
        "notification-broadcast-created",
        refreshNotifications
      );

      socket.off(
        "notification-deleted",
        refreshNotifications
      );
    };
  }, [loadPage]);

  /* ====================================================
     LOCK BACKGROUND SCROLL WHEN A MODAL IS OPEN
  ==================================================== */

  useEffect(() => {
    if (!composeOpen && !detailsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [composeOpen, detailsOpen]);

  /* ====================================================
     USER SEARCH
  ==================================================== */

  useEffect(() => {
    const query =
      userSearch.trim();

    if (
      query.length < 2
    ) {
      setUserSearchResults([]);
      return;
    }

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setUserSearchLoading(
              true
            );

            const response =
              await api.get(
                "/admin/notifications/users/search",
                {
                  params: {
                    search: query,
                  },
                }
              );

            const users =
              response.data?.users ||
              [];

            setUserSearchResults(
              Array.isArray(users)
                ? users
                : []
            );
          } catch (searchError) {
            console.error(
              "Notification user search error:",
              searchError
            );

            setUserSearchResults([]);
          } finally {
            setUserSearchLoading(
              false
            );
          }
        },
        500
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [userSearch]);

  /* ====================================================
     COMPUTED
  ==================================================== */

  const statsCards =
    useMemo(
      () => [
        {
          title:
            "Total Broadcasts",
          value:
            statistics.totalNotifications,
          description:
            "All notification campaigns",
          icon: Bell,
          iconClass:
            "bg-blue-500/10 text-blue-400",
        },
        {
          title: "Sent Today",
          value:
            statistics.sentToday,
          description:
            "Broadcasts created today",
          icon: Send,
          iconClass:
            "bg-green-500/10 text-green-400",
        },
        {
          title:
            "Total Recipients",
          value:
            statistics.totalRecipients,
          description:
            "All delivered notifications",
          icon: Users,
          iconClass:
            "bg-violet-500/10 text-violet-400",
        },
        {
          title: "Read Rate",
          value: percentage(
            statistics.readRate
          ),
          description:
            `${statistics.read} opened notifications`,
          icon: Eye,
          iconClass:
            "bg-cyan-500/10 text-cyan-400",
        },
      ],
      [statistics]
    );

  const canSend = Boolean(
    form.title.trim() &&
      form.message.trim() &&
      (form.audience !== "ROLE" || form.targetRole) &&
      (form.audience !== "USER" ||
        form.targetUserId.trim() ||
        form.targetEmail.trim()) &&
      (form.audience !== "MULTIPLE_USERS" ||
        selectedUsers.length > 0)
  );

  /* ====================================================
     FORM HELPERS
  ==================================================== */

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetComposeForm =
    () => {
      setForm(DEFAULT_FORM);
      setSelectedUsers([]);
      setUserSearch("");
      setUserSearchResults([]);
    };

  const closeCompose =
    () => {
      if (sending) {
        return;
      }

      setComposeOpen(false);
      resetComposeForm();
    };

  const addSelectedUser = (user) => {
    setSelectedUsers(
      (current) => {
        if (
          current.some(
            (item) =>
              item.id === user.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          user,
        ];
      }
    );

    setUserSearch("");
    setUserSearchResults([]);
  };

  const removeSelectedUser = (userId) => {
    setSelectedUsers(
      (current) =>
        current.filter(
          (item) =>
            item.id !== userId
        )
    );
  };

  /* ====================================================
     SEND
  ==================================================== */

  const sendNotification =
    async () => {
      if (!canSend) {
        setError(
          "Complete all required notification fields."
        );

        return;
      }

      try {
        setSending(true);
        setError("");
        setSuccessMessage("");

        const payload = {
          title:
            form.title.trim(),

          message:
            form.message.trim(),

          type: form.type,
          priority:
            form.priority,
          audience:
            form.audience,

          targetRole:
            form.audience ===
            "ROLE"
              ? form.targetRole
              : undefined,

          targetUserId:
            form.audience ===
            "USER"
              ? form.targetUserId ||
                undefined
              : undefined,

          targetEmail:
            form.audience ===
            "USER"
              ? form.targetEmail ||
                undefined
              : undefined,

          userIds:
            form.audience ===
            "MULTIPLE_USERS"
              ? selectedUsers.map(
                  (user) => user.id
                )
              : undefined,

          actionText:
            form.actionText.trim() ||
            undefined,

          actionUrl:
            form.actionUrl.trim() ||
            undefined,

          imageUrl:
            form.imageUrl.trim() ||
            undefined,
        };

        const response =
          await api.post(
            "/admin/notifications/send",
            payload
          );

        setSuccessMessage(
          response.data?.message ||
            "Notification sent successfully."
        );

        closeCompose();

        setCurrentPage(1);

        await loadPage({
          silent: true,
        });
      } catch (sendError) {
        setError(
          getErrorMessage(
            sendError,
            "Unable to send notification."
          )
        );
      } finally {
        setSending(false);
      }
    };

  /* ====================================================
     DELETE
  ==================================================== */

  const deleteNotification =
    async (
      notification
    ) => {
      const confirmed =
        window.confirm(
          `Delete "${notification.title}" for every recipient?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          notification.batchId ||
            notification.id
        );

        setError("");

        await api.delete(
          `/admin/notifications/${
            notification.batchId ||
            notification.id
          }`
        );

        if (
          (selectedNotification?.batchId ||
            selectedNotification?.id) ===
          (notification.batchId || notification.id)
        ) {
          setSelectedNotification(
            null
          );

          setDetailsOpen(false);
        }

        await loadPage({
          silent: true,
        });
      } catch (deleteError) {
        setError(
          getErrorMessage(
            deleteError,
            "Unable to delete notification."
          )
        );
      } finally {
        setDeletingId(null);
      }
    };
    return (
  <div className="min-h-screen bg-[#060B17] text-white">

    {/* ================= HEADER ================= */}

    <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl">

      <div className="mx-auto max-w-[1700px] px-8 py-8">

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="rounded-2xl bg-blue-600/20 p-3">

                <BellRing className="h-7 w-7 text-blue-400" />

              </div>

              <div>

                <h1 className="text-4xl font-black">

                  Notification Center

                </h1>

                <p className="mt-2 text-slate-400">

                  Enterprise notification broadcasting,
                  analytics and delivery management.

                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap gap-3">

            <button

              onClick={() => loadPage({ silent: true })}

              disabled={refreshing}

              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 hover:border-blue-500"

            >

              {refreshing ? (

                <Loader2 className="h-5 w-5 animate-spin" />

              ) : (

                <RefreshCcw className="h-5 w-5" />

              )}

              Refresh

            </button>

            <button

              onClick={() => setComposeOpen(true)}

              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"

            >

              <Plus className="h-5 w-5" />

              Send Notification

            </button>

          </div>

        </div>

      </div>

    </div>



    {/* ================= ALERTS ================= */}

    <div className="mx-auto max-w-[1700px] px-8 pt-8">

      {error && (

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">

          <AlertCircle className="h-6 w-6" />

          {error}

        </div>

      )}

      {successMessage && (

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-green-300">

          <CheckCircle2 className="h-6 w-6" />

          {successMessage}

        </div>

      )}

    </div>



    {/* ================= STATISTICS ================= */}

    <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-6 px-8 md:grid-cols-2 xl:grid-cols-4">

      {statsCards.map((card) => {

        const Icon = card.icon;

        return (

          <div

            key={card.title}

            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-7"

          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-400">

                  {card.title}

                </p>

                <h2 className="mt-3 text-4xl font-black">

                  {card.value}

                </h2>

                <p className="mt-2 text-xs text-slate-500">

                  {card.description}

                </p>

              </div>

              <div

                className={`rounded-2xl p-4 ${card.iconClass}`}

              >

                <Icon className="h-8 w-8" />

              </div>

            </div>

          </div>

        );

      })}

    </div>



    {/* ================= FILTER BAR ================= */}

    <div className="mx-auto mt-10 max-w-[1700px] px-8">

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          <div className="relative">

            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-500" />

            <input

              value={search}

              onChange={(e) =>
                setSearch(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAppliedSearch(search.trim());
                  setAppliedType(selectedType);
                  setAppliedPriority(selectedPriority);
                  setAppliedAudience(selectedAudience);
                  setCurrentPage(1);
                }
              }}

              placeholder="Search notification..."

              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 outline-none"

            />

          </div>



          <select

            value={selectedType}

            onChange={(e) =>

              setSelectedType(e.target.value)

            }

            className="rounded-xl border border-slate-700 bg-slate-950 px-4"

          >

            <option value="">

              All Types

            </option>

            {TYPE_OPTIONS.map((item) => (

              <option key={item}>

                {item}

              </option>

            ))}

          </select>



          <select

            value={selectedPriority}

            onChange={(e) =>

              setSelectedPriority(

                e.target.value

              )

            }

            className="rounded-xl border border-slate-700 bg-slate-950 px-4"

          >

            <option value="">

              All Priority

            </option>

            {PRIORITY_OPTIONS.map((item) => (

              <option key={item}>

                {item}

              </option>

            ))}

          </select>



          <select

            value={selectedAudience}

            onChange={(e) =>

              setSelectedAudience(

                e.target.value

              )

            }

            className="rounded-xl border border-slate-700 bg-slate-950 px-4"

          >

            <option value="">

              All Audience

            </option>

            {AUDIENCE_OPTIONS.map((item) => (

              <option

                key={item.value}

                value={item.value}

              >

                {item.label}

              </option>

            ))}

          </select>



          <button
            type="button"
            onClick={() => {
              setAppliedSearch(search.trim());
              setAppliedType(selectedType);
              setAppliedPriority(selectedPriority);
              setAppliedAudience(selectedAudience);
              setCurrentPage(1);
            }}
            className="rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700"
          >

            Apply Filters

          </button>

        </div>

      </div>

    </div>
        {/* ================= HISTORY ================= */}

    <div className="mx-auto mt-8 max-w-[1700px] px-8 pb-16">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col gap-4 border-b border-slate-800 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Notification History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalItems.toLocaleString()} broadcast
              {totalItems === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Activity size={17} />

            Live notification activity
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-950"
                />
              )
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-slate-500">
              <Bell size={38} />
            </div>

            <h3 className="mt-6 text-2xl font-bold">
              No notifications found
            </h3>

            <p className="mt-3 max-w-md text-slate-500">
              There are currently no broadcasts matching
              your selected filters.
            </p>

            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="mt-7 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
            >
              <Plus size={18} />
              Send First Notification
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1250px]">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">
                      Notification
                    </th>

                    <th className="px-6 py-4">
                      Type
                    </th>

                    <th className="px-6 py-4">
                      Audience
                    </th>

                    <th className="px-6 py-4">
                      Priority
                    </th>

                    <th className="px-6 py-4">
                      Delivery
                    </th>

                    <th className="px-6 py-4">
                      Read rate
                    </th>

                    <th className="px-6 py-4">
                      Created
                    </th>

                    <th className="px-6 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {notifications.map(
                    (notification) => (
                      <tr
                        key={
                          notification.batchId ||
                          notification.id
                        }
                        className="transition hover:bg-slate-800/40"
                      >
                        <td className="max-w-sm px-6 py-5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNotification(
                                notification
                              );

                              setDetailsOpen(true);
                            }}
                            className="text-left"
                          >
                            <p className="line-clamp-1 font-semibold text-white hover:text-blue-400">
                              {notification.title}
                            </p>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                              {notification.message}
                            </p>
                          </button>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getTypeClasses(
                              notification.type
                            )}`}
                          >
                            {notification.type}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Users
                              size={17}
                              className="text-slate-500"
                            />

                            <div>
                              <p className="font-medium">
                                {notification.audience}
                              </p>

                              {notification.targetRole && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    notification.targetRole
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getPriorityClasses(
                              notification.priority
                            )}`}
                          >
                            {notification.priority}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-semibold">
                            {Number(
                              notification.deliveredCount ||
                                notification.recipientCount ||
                                0
                            ).toLocaleString()}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            recipients
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">
                                {
                                  notification.readCount
                                }{" "}
                                read
                              </span>

                              <span className="font-semibold text-cyan-400">
                                {percentage(
                                  notification.readRate
                                )}
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-cyan-500"
                                style={{
                                  width: `${Math.min(
                                    Number(
                                      notification.readRate ||
                                        0
                                    ),
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-sm text-slate-300">
                            {formatDate(
                              notification.createdAt
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {notification.createdByName ||
                              notification.createdByEmail ||
                              "System"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedNotification(
                                  notification
                                );

                                setDetailsOpen(true);
                              }}
                              className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-400 hover:border-blue-500 hover:text-blue-400"
                              title="View details"
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteNotification(
                                  notification
                                )
                              }
                              disabled={
                                deletingId ===
                                (notification.batchId ||
                                  notification.id)
                              }
                              className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                              title="Delete notification"
                            >
                              {deletingId ===
                              (notification.batchId ||
                                notification.id) ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-4 p-5 xl:hidden">
              {notifications.map(
                (notification) => (
                  <article
                    key={
                      notification.batchId ||
                      notification.id
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="line-clamp-1 font-bold">
                          {notification.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                          {notification.message}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNotification(
                            notification
                          );

                          setDetailsOpen(true);
                        }}
                        className="shrink-0 rounded-xl border border-slate-800 p-2.5 text-slate-400"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getTypeClasses(
                          notification.type
                        )}`}
                      >
                        {notification.type}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getPriorityClasses(
                          notification.priority
                        )}`}
                      >
                        {notification.priority}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                        {notification.audience}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs text-slate-500">
                          Recipients
                        </p>

                        <p className="mt-2 text-xl font-bold">
                          {Number(
                            notification.recipientCount ||
                              notification.totalRecipients ||
                              0
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-xs text-slate-500">
                          Read rate
                        </p>

                        <p className="mt-2 text-xl font-bold text-cyan-400">
                          {percentage(
                            notification.readRate
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                      <p className="text-xs text-slate-500">
                        {formatDate(
                          notification.createdAt
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          deleteNotification(notification)
                        }
                        disabled={
                          deletingId ===
                          (notification.batchId ||
                            notification.id)
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-red-400"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col gap-4 border-t border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(page - 1, 1)
                    )
                  }
                  disabled={currentPage <= 1}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(
                        page + 1,
                        totalPages
                      )
                    )
                  }
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ================= COMPOSE MODAL ================= */}

    {composeOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center">
        <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-5 backdrop-blur-xl sm:px-8">
            <div>
              <h2 className="text-2xl font-extrabold">
                Send Notification
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Create and broadcast a platform message.
              </p>
            </div>

            <button
              type="button"
              onClick={closeCompose}
              className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              {/* AUDIENCE */}

              <div>
                <label className="mb-3 block text-sm font-semibold">
                  Audience
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {AUDIENCE_OPTIONS.map(
                    (option) => {
                      const Icon = option.icon;

                      const active =
                        form.audience ===
                        option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            updateForm(
                              "audience",
                              option.value
                            );

                            updateForm(
                              "targetRole",
                              ""
                            );

                            updateForm(
                              "targetUserId",
                              ""
                            );

                            updateForm(
                              "targetEmail",
                              ""
                            );

                            setSelectedUsers([]);
                          }}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-slate-800 bg-slate-950 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-xl p-2.5 ${
                                active
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              <Icon size={19} />
                            </div>

                            <div>
                              <p className="font-semibold">
                                {option.label}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {
                                  option.description
                                }
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* ROLE */}

              {form.audience === "ROLE" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Target Role
                  </label>

                  <select
                    value={form.targetRole}
                    onChange={(event) =>
                      updateForm(
                        "targetRole",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select a role
                    </option>

                    {ROLE_OPTIONS.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SINGLE USER */}

              {form.audience === "USER" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      User ID
                    </label>

                    <input
                      value={form.targetUserId}
                      onChange={(event) =>
                        updateForm(
                          "targetUserId",
                          event.target.value
                        )
                      }
                      placeholder="User account ID"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      User Email
                    </label>

                    <input
                      type="email"
                      value={form.targetEmail}
                      onChange={(event) =>
                        updateForm(
                          "targetEmail",
                          event.target.value
                        )
                      }
                      placeholder="developer@example.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* MULTIPLE USERS */}

              {form.audience ===
                "MULTIPLE_USERS" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Search and Select Users
                  </label>

                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      value={userSearch}
                      onChange={(event) =>
                        setUserSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search name, email or phone..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-12 pr-12 outline-none focus:border-blue-500"
                    />

                    {userSearchLoading && (
                      <Loader2
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-400"
                      />
                    )}
                  </div>

                  {userSearchResults.length >
                    0 && (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2">
                      {userSearchResults.map(
                        (user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() =>
                              addSelectedUser(user)
                            }
                            className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-slate-800"
                          >
                            <div>
                              <p className="font-semibold">
                                {user.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {user.email} •{" "}
                                {user.role}
                              </p>
                            </div>

                            <Plus
                              size={18}
                              className="text-blue-400"
                            />
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {selectedUsers.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedUsers.map(
                        (user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300"
                          >
                            <span>{user.name}</span>

                            <button
                              type="button"
                              onClick={() =>
                                removeSelectedUser(
                                  user.id
                                )
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TITLE */}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Title
                </label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    updateForm(
                      "title",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Notification title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {form.title.length}/200
                </p>
              </div>

              {/* MESSAGE */}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Message
                </label>

                <textarea
                  value={form.message}
                  onChange={(event) =>
                    updateForm(
                      "message",
                      event.target.value
                    )
                  }
                  maxLength={5000}
                  rows={7}
                  placeholder="Write the notification message..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {form.message.length}/5000
                </p>
              </div>

              {/* TYPE AND PRIORITY */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Type
                  </label>

                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateForm(
                        "type",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                  >
                    {TYPE_OPTIONS.map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateForm(
                        "priority",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-blue-500"
                  >
                    {PRIORITY_OPTIONS.map(
                      (priority) => (
                        <option
                          key={priority}
                          value={priority}
                        >
                          {priority}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* OPTIONAL ACTION */}

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="font-bold">
                  Optional Action
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    value={form.actionText}
                    onChange={(event) =>
                      updateForm(
                        "actionText",
                        event.target.value
                      )
                    }
                    placeholder="Button text"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                  />

                  <input
                    value={form.actionUrl}
                    onChange={(event) =>
                      updateForm(
                        "actionUrl",
                        event.target.value
                      )
                    }
                    placeholder="/dashboard/data"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <input
                  value={form.imageUrl}
                  onChange={(event) =>
                    updateForm(
                      "imageUrl",
                      event.target.value
                    )
                  }
                  placeholder="Optional image URL"
                  className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* PREVIEW */}

            <div>
              <div className="sticky top-28 rounded-3xl border border-slate-700 bg-slate-950 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Live Preview
                </p>

                <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${getTypeClasses(
                        form.type
                      )}`}
                    >
                      <BellRing size={23} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">
                          {form.title ||
                            "Notification title"}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityClasses(
                            form.priority
                          )}`}
                        >
                          {form.priority}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-400">
                        {form.message ||
                          "Your notification message will appear here."}
                      </p>

                      {form.actionText &&
                        form.actionUrl && (
                          <button
                            type="button"
                            className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold"
                          >
                            {form.actionText}
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs text-slate-500">
                    Selected Audience
                  </p>

                  <p className="mt-2 font-bold">
                    {form.audience}
                  </p>

                  {form.targetRole && (
                    <p className="mt-1 text-sm text-blue-400">
                      {form.targetRole}
                    </p>
                  )}

                  {form.audience ===
                    "MULTIPLE_USERS" && (
                    <p className="mt-1 text-sm text-blue-400">
                      {selectedUsers.length} selected
                      user
                      {selectedUsers.length === 1
                        ? ""
                        : "s"}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={sendNotification}
                  disabled={!canSend || sending}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-bold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2
                        size={19}
                        className="animate-spin"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={19} />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    )}

    {/* ================= DETAILS DRAWER ================= */}

    {detailsOpen && selectedNotification && (
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Close details"
          onClick={() => {
            setDetailsOpen(false);
            setSelectedNotification(null);
          }}
          className="absolute inset-0 h-full w-full"
        />

        <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-xl overflow-y-auto border-l border-slate-700 bg-slate-900 shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 p-6 backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-bold">
                Notification Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Batch ID:{" "}
                {selectedNotification.batchId ||
                  selectedNotification.id}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDetailsOpen(false);
                setSelectedNotification(null);
              }}
              className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${getTypeClasses(
                    selectedNotification.type
                  )}`}
                >
                  {selectedNotification.type}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${getPriorityClasses(
                    selectedNotification.priority
                  )}`}
                >
                  {selectedNotification.priority}
                </span>

                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-400">
                  SENT
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-extrabold">
                {selectedNotification.title}
              </h3>

              <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-400">
                {selectedNotification.message}
              </p>

              {selectedNotification.actionText &&
                selectedNotification.actionUrl && (
                  <a
                    href={
                      selectedNotification.actionUrl
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold"
                  >
                    {
                      selectedNotification.actionText
                    }
                  </a>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DetailStat
                title="Recipients"
                value={Number(
                  selectedNotification.recipientCount ||
                    selectedNotification.totalRecipients ||
                    0
                ).toLocaleString()}
                icon={<Users size={19} />}
              />

              <DetailStat
                title="Read"
                value={Number(
                  selectedNotification.readCount || 0
                ).toLocaleString()}
                icon={<Eye size={19} />}
              />

              <DetailStat
                title="Unread"
                value={Number(
                  selectedNotification.unreadCount || 0
                ).toLocaleString()}
                icon={
                  <MessageSquareText size={19} />
                }
              />

              <DetailStat
                title="Read Rate"
                value={percentage(
                  selectedNotification.readRate
                )}
                icon={<Activity size={19} />}
              />
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="font-bold">
                Broadcast Information
              </h3>

              <dl className="mt-5 space-y-4">
                <DetailRow
                  label="Audience"
                  value={
                    selectedNotification.audience
                  }
                />

                <DetailRow
                  label="Target Role"
                  value={
                    selectedNotification.targetRole ||
                    "-"
                  }
                />

                <DetailRow
                  label="Created By"
                  value={
                    selectedNotification.createdByName ||
                    selectedNotification.createdByEmail ||
                    "System"
                  }
                />

                <DetailRow
                  label="Created At"
                  value={formatDate(
                    selectedNotification.createdAt
                  )}
                />
              </dl>
            </div>

            <button
              type="button"
              onClick={() =>
                deleteNotification(
                  selectedNotification
                )
              }
              disabled={
                deletingId ===
                (selectedNotification.batchId ||
                  selectedNotification.id)
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-4 font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              {deletingId ===
              (selectedNotification.batchId ||
                selectedNotification.id) ? (
                <Loader2
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={19} />
              )}

              Delete Notification
            </button>
          </div>
        </aside>
      </div>
    )}
  </div>
);
}

/* ======================================================
   SMALL COMPONENTS
====================================================== */

function DetailStat({
  title,
  value,
    icon,
  }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="text-blue-400">{icon}</div>

      <p className="mt-4 text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-extrabold">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-800 pb-4 last:border-none last:pb-0">
      <dt className="text-sm text-slate-500">
        {label}
      </dt>

      <dd className="max-w-[65%] text-right text-sm font-semibold text-slate-200">
        {value}
      </dd>
    </div>
  );
}