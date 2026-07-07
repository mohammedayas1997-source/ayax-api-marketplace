let io = null;

exports.initSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    const { deviceId } = socket.handshake.auth || {};

    if (deviceId) {
      socket.join(deviceId);
      console.log(`Gateway joined device room: ${deviceId}`);
    }

    socket.on("join", (room) => {
      socket.join(room);
      console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on("gateway-device-online", ({ deviceId }) => {
      if (deviceId) {
        socket.join(deviceId);
        console.log(`Gateway online room joined: ${deviceId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
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