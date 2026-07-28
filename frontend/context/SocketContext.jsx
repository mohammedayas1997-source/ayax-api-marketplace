"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "";

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      apiUrl.replace(/\/api\/v1\/?$/, "");

    if (!socketUrl) {
      console.error(
        "NEXT_PUBLIC_SOCKET_URL is not configured."
      );
      return undefined;
    }

    const token =
      window.localStorage.getItem("token");

    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],

      auth: token
        ? {
            token,
          }
        : {},

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const handleConnect = () => {
      console.log(
        "Socket connected:",
        socketInstance.id
      );

      if (token) {
        socketInstance.emit("authenticate", {
          token,
        });
      }
    };

    const handleConnectError = (error) => {
      console.error(
        "Socket connection error:",
        error.message
      );
    };

    const handleWalletUpdated = (payload) => {
      window.dispatchEvent(
        new CustomEvent("wallet-updated", {
          detail: payload,
        })
      );
    };

    const handleNotification = (payload) => {
      const notification =
        payload?.notification || payload;

      window.dispatchEvent(
        new CustomEvent(
          "notification-received",
          {
            detail: notification,
          }
        )
      );
    };

    socketInstance.on(
      "connect",
      handleConnect
    );

    socketInstance.on(
      "connect_error",
      handleConnectError
    );

    socketInstance.on(
      "wallet:updated",
      handleWalletUpdated
    );

    socketInstance.on(
      "notification",
      handleNotification
    );

    socketInstance.on(
      "notification:new",
      handleNotification
    );

    socketInstance.on(
      "broadcast",
      handleNotification
    );

    setSocket(socketInstance);

    return () => {
      socketInstance.off(
        "connect",
        handleConnect
      );

      socketInstance.off(
        "connect_error",
        handleConnectError
      );

      socketInstance.off(
        "wallet:updated",
        handleWalletUpdated
      );

      socketInstance.off(
        "notification",
        handleNotification
      );

      socketInstance.off(
        "notification:new",
        handleNotification
      );

      socketInstance.off(
        "broadcast",
        handleNotification
      );

      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}