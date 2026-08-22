let io = null;
const prisma = require("../config/prisma");

exports.initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on("connection", async (socket) => {
    // 1. Extract deviceId from all possible transport layers (auth, query, headers)
    const deviceId =
      socket.handshake.auth?.deviceId ||
      socket.handshake.query?.deviceId ||
      socket.handshake.headers?.["x-device-id"] ||
      null;

    const secretKey =
      socket.handshake.auth?.secretKey ||
      socket.handshake.query?.secretKey ||
      null;

    console.log(`[SOCKET CONNECTED]: ${socket.id} | Device: ${deviceId || "Unknown"}`);

    if (deviceId) {
      socket.join(deviceId);
      socket.deviceId = deviceId;

      try {
        await prisma.gsmDevice.updateMany({
          where: { id: deviceId },
          data: {
            socketId: socket.id,
            status: "ONLINE",
            lastSeen: new Date(),
          },
        });
        console.log(`[GSM DEVICE ONLINE]: ${deviceId} joined room: ${deviceId}`);
      } catch (e) {
        console.log("Socket connection DB error:", e.message);
      }
    }

    // Direct Join
    socket.on("join", (room) => {
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    // Explicit Device Registration from Android Client
    socket.on("gateway-device-online", async (data) => {
      const targetId = typeof data === "string" ? data : data?.deviceId;
      if (!targetId) return;

      socket.join(targetId);
      socket.deviceId = targetId;

      try {
        await prisma.gsmDevice.updateMany({
          where: { id: targetId },
          data: {
            socketId: socket.id,
            status: "ONLINE",
            lastSeen: new Date(),
          },
        });
        console.log(`[EVENT: gateway-device-online]: ${targetId} bound to socket ${socket.id}`);
      } catch (e) {
        console.log("Device online event error:", e.message);
      }
    });

    // Device Heartbeat via Socket
    socket.on("gateway-heartbeat", async (data) => {
      const targetId = typeof data === "string" ? data : data?.deviceId || socket.deviceId;
      if (!targetId) return;

      try {
        await prisma.gsmDevice.updateMany({
          where: { id: targetId },
          data: {
            lastSeen: new Date(),
            status: "ONLINE",
          },
        });
      } catch (e) {
        console.log("Socket Heartbeat error:", e.message);
      }
    });

    socket.on("gateway-command-result", (payload) => {
      io.emit("gateway-command-result", payload);
    });

    socket.on("gateway-log", (payload) => {
      io.emit("gateway-log", payload);
    });

    socket.on("disconnect", async () => {
      const activeDevId = socket.deviceId || deviceId;
      console.log(`[SOCKET DISCONNECTED]: ${socket.id} | Device: ${activeDevId || "None"}`);

      if (activeDevId) {
        try {
          // Check if device reconnected on another socket before marking offline
          const currentDevice = await prisma.gsmDevice.findUnique({
            where: { id: activeDevId },
          });

          if (currentDevice && currentDevice.socketId === socket.id) {
            await prisma.gsmDevice.update({
              where: { id: activeDevId },
              data: {
                socketId: null,
                status: "OFFLINE",
                lastSeen: new Date(),
              },
            });
            console.log(`[GSM DEVICE OFFLINE]: ${activeDevId}`);
          }
        } catch (e) {
          console.log("Disconnect DB error:", e.message);
        }
      }
    });
  });

  return io;
};

exports.getIO = () => io;

exports.emitEvent = (event, payload, room = null) => {
  if (!io) return;
  if (room) {
    io.to(room).emit(event, payload);
    return;
  }
  io.emit(event, payload);
};

// Enhanced Command Dispatcher (Multi-event broadcast to ensure Android pickup)
exports.emitGatewayCommand = (deviceId, command) => {
  if (!io) {
    console.error("[EMIT ERROR]: Socket.io instance is not initialized.");
    return false;
  }

  console.log(`[DISPATCHING COMMAND]: Ref ${command.reference} -> Device Room: ${deviceId}`);

  // 1. Emit to device room under standard name
  io.to(deviceId).emit("gateway-command", command);

  // 2. Emit under generic 'command' name (some Android client builds use this)
  io.to(deviceId).emit("command", command);

  // 3. Emit dedicated channel per device
  io.emit(`gateway-command-${deviceId}`, command);

  return true;
};