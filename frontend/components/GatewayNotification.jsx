"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";

export default function GatewayNotification() {

    const socket = useSocket();

    const [message, setMessage] = useState(null);

    useEffect(() => {

        if (!socket) return;

        const show = (msg) => {

            setMessage(msg);

            setTimeout(() => {
                setMessage(null);
            }, 4000);

        };

        socket.on("gateway-device-online", () =>
            show("🟢 Gateway Device Online")
        );

        socket.on("gateway-device-offline", () =>
            show("🔴 Gateway Device Offline")
        );

        socket.on("wallet-updated", () =>
            show("💰 Wallet Updated")
        );

        socket.on("gsm-command-updated", () =>
            show("📡 GSM Command Updated")
        );

        return () => {

            socket.off("gateway-device-online");

            socket.off("gateway-device-offline");

            socket.off("wallet-updated");

            socket.off("gsm-command-updated");

        };

    }, [socket]);

    if (!message) return null;

    return (
        <div
            className="
            fixed
            top-5
            right-5
            z-50
            rounded-xl
            bg-black
            text-white
            px-5
            py-3
            shadow-xl"
        >
            {message}
        </div>
    );

}