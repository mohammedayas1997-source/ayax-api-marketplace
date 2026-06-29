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

    socket.on("join", (room) => {
      socket.join(room);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) {
    return null;
  }

  return io;
};

exports.emitEvent = (event, payload, room = null) => {
  if (!io) return;

  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
};