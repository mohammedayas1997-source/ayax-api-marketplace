let io = null;
const prisma = require("../config/prisma");

// Buffer don hana mayar da device OFFLINE nan take idan socket ya dan yanke na dakika kadan
const disconnectTimeouts = new Map();

exports.initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    pingInterval: 10000,
    pingTimeout: 7000,
    connectTimeout: 20000,
    transports: ["websocket", "polling"],
  });

  io.on("connection", async (socket) => {
    let deviceId =
      socket.handshake.auth?.deviceId ||
      socket.handshake.query?.deviceId ||
      socket.handshake.headers?.["x-device-id"] ||
      null;

    const bindDeviceToSocket = async (targetDeviceId, source = "Handshake") => {
      if (!targetDeviceId) return;

      if (disconnectTimeouts.has(targetDeviceId)) {
        clearTimeout(disconnectTimeouts.get(targetDeviceId));
        disconnectTimeouts.delete(targetDeviceId);
      }

      socket.deviceId = targetDeviceId;
      // Shigar da socket din a dukkan rooms da wayar za ta iya bukata
      socket.join(targetDeviceId);
      socket.join(`device_${targetDeviceId}`);
      socket.join(`gateway_${targetDeviceId}`);

      try {
        await prisma.gsmDevice.updateMany({
          where: { id: targetDeviceId },
          data: {
            socketId: socket.id,
            status: "ONLINE",
            lastSeen: new Date(),
          },
        });
        console.log(`📱 [GSM BOUND (${source})]: ${targetDeviceId} -> Joined Rooms`);
        socket.emit("registered", { status: "OK", deviceId: targetDeviceId });
      } catch (err) {
        console.log("DB Bind Error:", err.message);
      }
    };

    if (deviceId) {
      await bindDeviceToSocket(deviceId, "Handshake Auth");
    } else {
      console.log(`[SOCKET CONNECTED]: ${socket.id} | Device: Pending Identification`);
    }

    const registrationEvents = [
      "register",
      "register-device",
      "identify",
      "gateway-device-online",
      "gateway-register",
      "device-auth",
      "pair",
      "gateway-heartbeat",
    ];

    registrationEvents.forEach((eventName) => {
      socket.on(eventName, async (data) => {
        const extractedId =
          typeof data === "string"
            ? data
            : data?.deviceId || data?.id || data?.device_id;

        if (extractedId) {
          await bindDeviceToSocket(extractedId, `Event: ${eventName}`);
        }
      });
    });

    socket.on("join", (room) => {
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} manually joined room: ${room}`);
      }
    });

    socket.on("gateway-command-result", (payload) => {
      io.emit("gateway-command-result", payload);
    });

    socket.on("gateway-log", (payload) => {
      io.emit("gateway-log", payload);
    });

    socket.on("disconnect", async (reason) => {
      const activeDevId = socket.deviceId;
      console.log(`[SOCKET DISCONNECTED]: ${socket.id} | Device: ${activeDevId || "None"} | Reason: ${reason}`);

      if (activeDevId) {
        if (disconnectTimeouts.has(activeDevId)) {
          clearTimeout(disconnectTimeouts.get(activeDevId));
        }

        const timeout = setTimeout(async () => {
          try {
            const dev = await prisma.gsmDevice.findUnique({
              where: { id: activeDevId },
            });

            if (dev && dev.socketId === socket.id) {
              await prisma.gsmDevice.update({
                where: { id: activeDevId },
                data: {
                  socketId: null,
                  status: "OFFLINE",
                  lastSeen: new Date(),
                },
              });
              console.log(`[GSM DEVICE OFFLINE CONFIRMED]: ${activeDevId}`);
            }
          } catch (e) {
            console.log("Disconnect DB Error:", e.message);
          } finally {
            disconnectTimeouts.delete(activeDevId);
          }
        }, 25000);

        disconnectTimeouts.set(activeDevId, timeout);
      }
    });
  });

  return io;
};

exports.getIO = () => io;

// Helper na gina daidaitaccen payload mai bayyane ba tare da boye code ba
const normalizeCommandPayload = (payload) => {
  const inner = payload?.payload || {};
  const isUssd =
    payload?.type === "USSD" ||
    inner?.type === "USSD" ||
    Boolean(payload?.ussdCode || payload?.code || inner?.ussdCode || inner?.code);

  const rawCode =
    payload?.code ||
    payload?.ussd ||
    payload?.ussdCode ||
    payload?.ussd_code ||
    payload?.rootCode ||
    inner?.code ||
    inner?.ussd ||
    inner?.ussdCode ||
    inner?.ussd_code ||
    inner?.rootCode ||
    (isUssd ? "*671#" : "");

  const stepsArray = Array.isArray(payload?.steps)
    ? payload.steps
    : Array.isArray(inner?.steps)
    ? inner.steps
    : [];

  return {
    ...inner,
    ...payload,
    // Filaye a bayyane a saman JSON don Android app ya gani kai tsaye
    id: payload?.id || payload?.commandId || inner?.id || inner?.commandId,
    commandId: payload?.commandId || payload?.id || inner?.commandId || inner?.id,
    reference: payload?.reference || inner?.reference,
    type: isUssd ? "USSD" : "SEND_SMS",
    action: isUssd ? "USSD" : "SEND_SMS",
    code: rawCode,
    ussd: rawCode,
    ussdCode: rawCode,
    ussd_code: rawCode,
    rootCode: rawCode,
    text: isUssd ? rawCode : (payload?.message || inner?.message || ""),
    steps: stepsArray,
    slotIndex: Number(payload?.slotIndex ?? inner?.slotIndex ?? payload?.simSlot ?? inner?.simSlot ?? 0),
    simSlot: Number(payload?.slotIndex ?? inner?.slotIndex ?? payload?.simSlot ?? inner?.simSlot ?? 0),
    targetPhone: payload?.targetPhone || payload?.phone || inner?.targetPhone || inner?.phone || "",
    phone: payload?.targetPhone || payload?.phone || inner?.targetPhone || inner?.phone || "",
  };
};

exports.emitEvent = (event, payload, room = null) => {
  if (!io) return;
  const safePayload = normalizeCommandPayload(payload);

  if (room) {
    // Tura a dukkan dakunan da ke da alaka da wayar
    io.to(room).emit(event, safePayload);
    io.to(`device_${room}`).emit(event, safePayload);
    io.to(`gateway_${room}`).emit(event, safePayload);
    return;
  }
  io.emit(event, safePayload);
};

exports.emitGatewayCommand = (deviceId, command) => {
  if (!io) {
    console.error("[EMIT ERROR]: Socket.io is not initialized.");
    return false;
  }

  const safeCommand = normalizeCommandPayload(command);
  console.log(`🚀 [DISPATCHING TO GATEWAY]: Ref: ${safeCommand.reference} -> Code: ${safeCommand.code} Steps: ${JSON.stringify(safeCommand.steps)}`);

  // Tura wa dukkan sunayen events da Android ke saurare a cikin dakunan wayar
  const targetRooms = [deviceId, `device_${deviceId}`, `gateway_${deviceId}`];

  targetRooms.forEach((r) => {
    io.to(r).emit("gateway-command", safeCommand);
    io.to(r).emit("command", safeCommand);
  });

  return true;
};