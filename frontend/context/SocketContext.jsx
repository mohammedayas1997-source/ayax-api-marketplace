"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socketInstance, setSocketInstance] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "";

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      apiUrl.replace(/\/api\/v1\/?$/, "");

    if (!socketUrl) {
      console.error(
        "Socket URL is missing. Set NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_API_URL."
      );

      return undefined;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],

      auth: token
        ? {
            token,
          }
        : {},

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const handleConnect = () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      setConnected(true);

      /*
       * Backend na iya amfani da user room
       * bayan ya tantance JWT token.
       */
      if (token) {
        socket.emit("authenticate", {
          token,
        });
      }
    };

    const handleDisconnect = (
      reason
    ) => {
      console.log(
        "Socket disconnected:",
        reason
      );

      setConnected(false);
    };

    const handleConnectError = (
      error
    ) => {
      console.error(
        "Socket connection error:",
        error.message
      );

      setConnected(false);
    };

    const handleNotification = (
      notification
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "notification-received",
          {
            detail: notification,
          }
        )
      );
    };

    const handleNewNotification = (
      payload
    ) => {
      const notification =
        payload?.notification ||
        payload;

      window.dispatchEvent(
        new CustomEvent(
          "notification-received",
          {
            detail: notification,
          }
        )
      );
    };

    const handleBroadcast = (
      payload
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "notification-received",
          {
            detail: payload,
          }
        )
      );
    };

    const handleWalletUpdated = (
      payload
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "wallet-updated",
          {
            detail: payload,
          }
        )
      );
    };

    const handleNotificationDeleted = (
      payload
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "notification-deleted",
          {
            detail: payload,
          }
        )
      );
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "notification",
      handleNotification
    );

    socket.on(
      "notification:new",
      handleNewNotification
    );

    socket.on(
      "broadcast",
      handleBroadcast
    );

    socket.on(
      "wallet:updated",
      handleWalletUpdated
    );

    socket.on(
      "notification-deleted",
      handleNotificationDeleted
    );

    setSocketInstance(socket);

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "notification",
        handleNotification
      );

      socket.off(
        "notification:new",
        handleNewNotification
      );

      socket.off(
        "broadcast",
        handleBroadcast
      );

      socket.off(
        "wallet:updated",
        handleWalletUpdated
      );

      socket.off(
        "notification-deleted",
        handleNotificationDeleted
      );

      socket.disconnect();

      setSocketInstance(null);
      setConnected(false);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      socket: socketInstance,
      connected,
    }),
    [
      socketInstance,
      connected,
    ]
  );

  return (
    <SocketContext.Provider
      value={contextValue}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context =
    useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket must be used inside SocketProvider."
    );
  }

  return context;
}