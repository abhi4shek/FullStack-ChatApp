import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

export function getReceiverSocketId(userId) {
  console.log("🔍 Getting socket ID for user:", userId, "->", userSocketMap[userId]);
  return userSocketMap[userId];
}

const userSocketMap = {};
const userCallState = {};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  console.log("🔌 New socket connection:", socket.id, "userId:", userId);

  if (!userId || userId === "undefined") {
    console.warn("🚫 Invalid or missing userId on socket connection");
    socket.disconnect(true);
    return;
  }

  userSocketMap[userId] = socket.id;
  socket.userId = userId;
  if (!userCallState[userId]) {
    userCallState[userId] = "idle";
  }

  console.log("👥 Updated userSocketMap:", Object.keys(userSocketMap));
  io.emit("onlineUsers", Object.keys(userSocketMap));

  socket.on("getOnlineUsers", () => {
    console.log("📋 Received getOnlineUsers from:", userId);
    socket.emit("onlineUsers", Object.keys(userSocketMap));
  });

  // ---- CALL EVENTS ---- //
  socket.on("call:request", ({ toUserId, callType, fullName, profilePic }) => {
    console.log("📞 Received call:request from:", socket.userId, "to:", toUserId, "type:", callType, "fullName:", fullName);
    const toSocketId = userSocketMap[toUserId];

    if (!toSocketId) {
      console.log("🚫 Receiver offline:", toUserId);
      return socket.emit("call:unavailable", { reason: "offline" });
    }

    if (userCallState[toUserId] !== "idle" || userCallState[socket.userId] !== "idle") {
      console.log("🚫 One or both users busy:", socket.userId, toUserId);
      return socket.emit("call:unavailable", { reason: "busy" });
    }

    userCallState[socket.userId] = "ringing";
    userCallState[toUserId] = "ringing";

    console.log("📡 Emitting call:ringing to:", toSocketId, "from:", socket.userId);
    io.to(toSocketId).emit("call:ringing", {
      fromUserId: socket.userId,
      callType,
      fullName,
      profilePic,
    });

    setTimeout(() => {
      if (userCallState[socket.userId] === "ringing" && userCallState[toUserId] === "ringing") {
        console.log("⏰ Call timeout for:", socket.userId, toUserId);
        userCallState[socket.userId] = "idle";
        userCallState[toUserId] = "idle";
        socket.emit("call:ended", { byUserId: toUserId, reason: "timeout" });
        io.to(toSocketId).emit("call:ended", { byUserId: socket.userId, reason: "timeout" });
      }
    }, 30000);
  });

  socket.on("call:accept", ({ fromUserId }) => {
    console.log("✅ Call accepted by:", socket.userId, "from:", fromUserId);
    const fromSocketId = userSocketMap[fromUserId];

    if (userCallState[socket.userId] !== "ringing" || userCallState[fromUserId] !== "ringing") {
      console.log("🚫 Invalid call state for accept:", socket.userId, fromUserId);
      return socket.emit("call:unavailable", { reason: "invalid" });
    }

    userCallState[socket.userId] = "in-call";
    userCallState[fromUserId] = "in-call";

    if (fromSocketId) {
      io.to(fromSocketId).emit("call:accepted", { byUserId: socket.userId });
    }
  });

  socket.on("call:decline", ({ fromUserId }) => {
    console.log("❌ Call declined by:", socket.userId, "from:", fromUserId);
    const fromSocketId = userSocketMap[fromUserId];

    userCallState[socket.userId] = "idle";
    userCallState[fromUserId] = "idle";

    if (fromSocketId) {
      io.to(fromSocketId).emit("call:declined", { byUserId: socket.userId });
    }
  });

  socket.on("call:end", ({ toUserId }) => {
    console.log("📴 Call ended by:", socket.userId, "to:", toUserId);
    const toSocketId = userSocketMap[toUserId];

    userCallState[socket.userId] = "idle";
    userCallState[toUserId] = "idle";

    if (toSocketId) {
      io.to(toSocketId).emit("call:ended", { byUserId: socket.userId });
    }
  });

  // ---- WEBRTC SIGNALING ---- //
  socket.on("webrtc:offer", ({ toUserId, offer }) => {
    const toSocketId = userSocketMap[toUserId];
    if (toSocketId) {
      console.log("📡 Relaying WebRTC offer from:", socket.userId, "to:", toUserId);
      io.to(toSocketId).emit("webrtc:offer", { fromUserId: socket.userId, offer });
    }
  });

  socket.on("webrtc:answer", ({ toUserId, answer }) => {
    const toSocketId = userSocketMap[toUserId];
    if (toSocketId) {
      console.log("📡 Relaying WebRTC answer from:", socket.userId, "to:", toUserId);
      io.to(toSocketId).emit("webrtc:answer", { fromUserId: socket.userId, answer });
    }
  });

  socket.on("webrtc:ice-candidate", ({ toUserId, candidate }) => {
    const toSocketId = userSocketMap[toUserId];
    if (toSocketId) {
      console.log("📡 Relaying ICE candidate from:", socket.userId, "to:", toUserId);
      io.to(toSocketId).emit("webrtc:ice-candidate", { fromUserId: socket.userId, candidate });
    }
  });

  // ---- DISCONNECT ---- //
  socket.on("disconnect", () => {
    if (!socket.userId) return;

    const userId = socket.userId;
    console.log("🔌 User disconnected:", userId, "socket:", socket.id);
    delete userSocketMap[userId];

    if (userCallState[userId] === "in-call" || userCallState[userId] === "ringing") {
      Object.keys(userSocketMap).forEach((otherUserId) => {
        if (
          userCallState[otherUserId] === "in-call" ||
          userCallState[otherUserId] === "ringing"
        ) {
          const otherSocketId = userSocketMap[otherUserId];
          console.log("📴 Notifying call end to:", otherUserId, "due to disconnect");
          io.to(otherSocketId).emit("call:ended", { byUserId: userId, reason: "disconnected" });
          userCallState[otherUserId] = "idle";
        }
      });
    }

    delete userCallState[userId];
    console.log("👥 Updated userSocketMap after disconnect:", Object.keys(userSocketMap));
    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };