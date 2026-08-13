let io = null;

const prisma = require("../config/prisma");

exports.initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", async (socket) => {
    console.log("Socket connected:", socket.id);

    const {
      deviceId,
      secretKey,
    } = socket.handshake.auth || {};

    if (deviceId) {
      socket.join(deviceId);

      try {
        await prisma.gsmDevice.updateMany({
          where: {
            id: deviceId,
            secretKey,
          },
          data: {
            socketId: socket.id,
            status: "ONLINE",
            lastSeen: new Date(),
          },
        });

        console.log("GSM Device ONLINE:", deviceId);
      } catch (e) {
        console.log("Socket connection DB error:", e.message);
      }
    }

    socket.on("join", (room) => {
      socket.join(room);
    });

    socket.on(
      "gateway-device-online",
      async ({ deviceId }) => {
        if (!deviceId) return;

        socket.join(deviceId);

        try {
          await prisma.gsmDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              socketId: socket.id,
              status: "ONLINE",
              lastSeen: new Date(),
            },
          });
        } catch (e) {
          console.log("Device online error:", e.message);
        }
      }
    );

    socket.on(
      "gateway-heartbeat",
      async ({ deviceId }) => {
        if (!deviceId) return;

        try {
          await prisma.gsmDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              lastSeen: new Date(),
              status: "ONLINE",
            },
          });
        } catch (e) {
          console.log("Heartbeat error:", e.message);
        }
      }
    );

    socket.on(
      "gateway-command-result",
      (payload) => {
        io.emit(
          "gateway-command-result",
          payload
        );
      }
    );

    socket.on(
      "gateway-log",
      (payload) => {
        io.emit(
          "gateway-log",
          payload
        );
      }
    );

    socket.on("disconnect", async () => {
      console.log(
        "Socket disconnected:",
        socket.id
      );

      if (deviceId) {
        try {
          await prisma.gsmDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              socketId: null,
              status: "OFFLINE",
              lastSeen: new Date(),
            },
          });
          console.log("GSM Device OFFLINE:", deviceId);
        } catch (e) {
          console.log("Disconnect DB error:", e.message);
        }
      }
    });
  });

  return io;
};

exports.getIO = () => io;

exports.emitEvent = (
  event,
  payload,
  room = null
) => {
  if (!io) return;

  if (room) {
    io.to(room).emit(event, payload);
    return;
  }

  io.emit(event, payload);
};

exports.emitGatewayCommand = (
  deviceId,
  command
) => {
  if (!io) return false;

  io.to(deviceId).emit(
    "gateway-command",
    command
  );

  return true;
};