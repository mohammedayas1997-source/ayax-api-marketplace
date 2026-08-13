"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Menu,
  X,
  Bell,
  Wallet,
  User,
  ChevronDown,
  LogOut,
  Settings,
  LoaderCircle,
} from "lucide-react";

import DashboardSidebar from "@/components/sidebars/DashboardSidebar";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const storedUser = localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    return null;
  }
};

export default function DashboardLayout({
  children,
  title,
  description,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const profileRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] =
    useState(0);

  const [headerLoading, setHeaderLoading] =
    useState(true);

  const fetchWallet = useCallback(async () => {
    try {
      const response = await api.get("/wallet");

      const walletData =
        response.data?.wallet ||
        response.data?.data?.wallet ||
        response.data?.data ||
        null;

      setWallet(walletData);

      return walletData;
    } catch (error) {
      console.error(
        "Dashboard wallet error:",
        error
      );

      return null;
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");

      const userData =
        response.data?.user ||
        response.data?.data?.user ||
        response.data?.data ||
        null;

      if (userData) {
        setUser(userData);

        localStorage.setItem(
          "user",
          JSON.stringify(userData)
        );
      }

      return userData;
    } catch (error) {
      console.warn(
        "Profile endpoint unavailable:",
        error
      );

      const storedUser = getStoredUser();

      if (storedUser) {
        setUser(storedUser);
      }

      return storedUser;
    }
  }, []);

  const fetchNotifications =
    useCallback(async () => {
      const possibleRoutes = [
        "/notifications/unread-count",
        "/notifications",
      ];

      for (const route of possibleRoutes) {
        try {
          const response = await api.get(route);

          const count =
            response.data?.unreadCount ??
            response.data?.count ??
            response.data?.data?.unreadCount;

          if (count !== undefined) {
            setNotificationCount(
              Number(count || 0)
            );

            return;
          }

          const notifications =
            response.data?.notifications ||
            response.data?.data?.notifications ||
            response.data?.data ||
            [];

          if (Array.isArray(notifications)) {
            setNotificationCount(
              notifications.filter(
                (item) =>
                  item?.read === false ||
                  item?.isRead === false ||
                  item?.status === "UNREAD"
              ).length
            );

            return;
          }
        } catch (error) {
          if (
            error?.response?.status !== 404
          ) {
            console.warn(
              "Notification load error:",
              error
            );

            return;
          }
        }
      }

      setNotificationCount(0);
    }, []);

  useEffect(() => {
    const loadHeader = async () => {
      try {
        setHeaderLoading(true);

        await Promise.allSettled([
          fetchWallet(),
          fetchProfile(),
          fetchNotifications(),
        ]);
      } finally {
        setHeaderLoading(false);
      }
    };

    loadHeader();
  }, [
    fetchWallet,
    fetchProfile,
    fetchNotifications,
  ]);

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (token) {
      socket.auth = { token };
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleWalletUpdated = () => {
      fetchWallet();
    };

    const handleProfileUpdated = () => {
      fetchProfile();
    };

    const handleNotification = () => {
      fetchNotifications();
    };

    socket.on(
      "wallet-updated",
      handleWalletUpdated
    );

    socket.on(
      "funding-approved",
      handleWalletUpdated
    );

    socket.on(
      "purchase-successful",
      handleWalletUpdated
    );

    socket.on(
      "transaction-updated",
      handleWalletUpdated
    );

    socket.on(
      "profile-updated",
      handleProfileUpdated
    );

    socket.on(
      "notification-created",
      handleNotification
    );

    socket.on(
      "notification-updated",
      handleNotification
    );

    return () => {
      socket.off(
        "wallet-updated",
        handleWalletUpdated
      );

      socket.off(
        "funding-approved",
        handleWalletUpdated
      );

      socket.off(
        "purchase-successful",
        handleWalletUpdated
      );

      socket.off(
        "transaction-updated",
        handleWalletUpdated
      );

      socket.off(
        "profile-updated",
        handleProfileUpdated
      );

      socket.off(
        "notification-created",
        handleNotification
      );

      socket.off(
        "notification-updated",
        handleNotification
      );
    };
  }, [
    fetchWallet,
    fetchProfile,
    fetchNotifications,
  ]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeProfileMenu
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeProfileMenu
      );
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (socket.connected) {
      socket.disconnect();
    }

    router.replace("/login");
  };

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.firstName ||
    "Developer";

  const displayEmail =
    user?.email || "";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-950 lg:block">
          <DashboardSidebar />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() =>
                setSidebarOpen(false)
              }
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <div className="relative h-full w-[85%] max-w-80 bg-slate-950 shadow-2xl">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(false)
                }
                className="absolute right-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
              >
                <X size={20} />
              </button>

              <DashboardSidebar
                onClose={() =>
                  setSidebarOpen(false)
                }
              />
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1 lg:ml-72">
          <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300 hover:bg-slate-800 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="truncate text-lg font-extrabold sm:text-xl lg:text-2xl">
                    {title}
                  </h1>
                )}

                {description && (
                  <p className="mt-1 hidden truncate text-sm text-slate-400 sm:block">
                    {description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                  href="/dashboard/wallet"
                  className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-300 hover:border-blue-500 hover:bg-slate-800 md:flex"
                >
                  <Wallet
                    size={18}
                    className="text-blue-400"
                  />

                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                      Wallet
                    </p>

                    <p className="text-sm font-bold text-white">
                      {headerLoading ? (
                        <LoaderCircle
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        formatNaira(
                          wallet?.balance
                        )
                      )}
                    </p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/notifications"
                  className="relative rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300 hover:bg-slate-800"
                >
                  <Bell size={18} />

                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {notificationCount > 99
                        ? "99+"
                        : notificationCount}
                    </span>
                  )}
                </Link>

                <div
                  ref={profileRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setProfileOpen(
                        (current) => !current
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 sm:px-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs font-bold">
                      {initials || (
                        <User size={16} />
                      )}
                    </span>

                    <span className="hidden max-w-32 truncate text-sm font-semibold xl:block">
                      {displayName}
                    </span>

                    <ChevronDown
                      size={15}
                      className={`hidden transition sm:block ${
                        profileOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                      <div className="border-b border-slate-800 px-5 py-4">
                        <p className="truncate font-bold text-white">
                          {displayName}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {displayEmail ||
                            "Developer account"}
                        </p>
                      </div>

                      <div className="p-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
                        >
                          <User size={17} />
                          My Profile
                        </Link>

                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
                        >
                          <Settings size={17} />
                          Settings
                        </Link>

                        <Link
                          href="/dashboard/wallet"
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 md:hidden"
                        >
                          <Wallet size={17} />
                          Wallet:{" "}
                          {formatNaira(
                            wallet?.balance
                          )}
                        </Link>

                        <button
                          type="button"
                          onClick={logout}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10"
                        >
                          <LogOut size={17} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}