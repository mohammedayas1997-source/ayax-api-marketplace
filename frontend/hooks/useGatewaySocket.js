"use client";

import { useEffect } from "react";
import { useSocket } from "@/context/SocketContext";

export default function useGatewaySocket(events = {}) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket]);

  return socket;
}