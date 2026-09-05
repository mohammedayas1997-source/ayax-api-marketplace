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
    // Saita ping da zai rike connection da karfi a network din waya
    pingInterval: 10000,
    pingTimeout: 7000,
    connectTimeout: 20000,
    transports: ["websocket", "polling"],
  });

  io.on("connection", async (socket) => {
    // 1. Duba deviceId ta handshake (auth, query, headers)
    let deviceId =
      socket.handshake.auth?.deviceId ||
      socket.handshake.query?.deviceId ||
      socket.handshake.headers?.["x-device-id"] ||
      null;

    const bindDeviceToSocket = async (targetDeviceId, source = "Handshake") => {
      if (!targetDeviceId) return;

      // Idan akwai pending disconnect timeout, soke shi domin wayar ta dawo
      if (disconnectTimeouts.has(targetDeviceId)) {
        clearTimeout(disconnectTimeouts.get(targetDeviceId));
        disconnectTimeouts.delete(targetDeviceId);
      }

      socket.deviceId = targetDeviceId;
      socket.join(targetDeviceId);
      socket.join(`device_${targetDeviceId}`);

      try {
        await prisma.gsmDevice.updateMany({
          where: { id: targetDeviceId },
          data: {
            socketId: socket.id,
            status: "ONLINE",
            lastSeen: new Date(),
          },
        });
        console.log(`📱 [GSM BOUND (${source})]: ${targetDeviceId} -> Room: ${targetDeviceId}`);

        // Aika tabbaci ga wayar cewa ta shiga tsaf
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

    // 2. Saurari duk wani event da Android App zai iya aiko da ID nashi
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
        // Kada a mayar da shi OFFLINE nan take; jira dakika 25 idan zai sake hadawa
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
        }, 25000); // 25 seconds grace period

        disconnectTimeouts.set(activeDevId, timeout);
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

// 3. Tura Command ta Room na Device
exports.emitGatewayCommand = (deviceId, command) => {
  if (!io) {
    console.error("[EMIT ERROR]: Socket.io is not initialized.");
    return false;
  }

  console.log(`🚀 [DISPATCHING TO GATEWAY]: Ref: ${command.reference} -> Target Device: ${deviceId}`);

  // Tura umarnin zuwa dakin na'urar (Room)
  io.to(deviceId).emit("gateway-command", command);

  return true;
};