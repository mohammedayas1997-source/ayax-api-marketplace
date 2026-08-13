"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function LiveSocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL ||
        "http://localhost:5000",
      {
        transports: ["websocket"],
        auth: {
          token,
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
      }
    );

    socketInstance.on("connect", () => {
      console.log("Socket Connected");
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket Disconnected");
      setConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.error(err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}