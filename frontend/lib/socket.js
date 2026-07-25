import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "https://ayax-api-marketplace.onrender.com";

export const socket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    transports: [
      "websocket",
      "polling",
    ],

    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,

    withCredentials: true,
  }
);