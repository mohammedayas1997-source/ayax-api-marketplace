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
        await prisma.gatewayDevice.updateMany({
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

        console.log("Gateway ONLINE:", deviceId);
      } catch (e) {
        console.log(e.message);
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
          await prisma.gatewayDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              socketId: socket.id,
              status: "ONLINE",
              lastSeen: new Date(),
            },
          });
        } catch {}
      }
    );

    socket.on(
      "gateway-heartbeat",
      async ({ deviceId }) => {
        try {
          await prisma.gatewayDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              lastSeen: new Date(),
              status: "ONLINE",
            },
          });
        } catch {}
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
          await prisma.gatewayDevice.update({
            where: {
              id: deviceId,
            },
            data: {
              socketId: null,
              status: "OFFLINE",
              lastSeen: new Date(),
            },
          });
        } catch {}
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