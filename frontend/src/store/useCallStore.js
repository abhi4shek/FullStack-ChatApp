import { create } from "zustand";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { useAuthStore } from "./useAuthStore"; // Import for logging

export const useCallStore = create((set, get) => ({
  isCalling: false,
  isReceivingCall: false,
  isInCall: false,
  callType: null,
  caller: null,
  receiver: null,
  webrtcOffer: null,
  webrtcAnswer: null,
  webrtcIceCandidate: null,
  isUnavailable: false,
  unavailableReason: null,
  reason: null,
  role: null,

  initializeCallSocket: (authUserId, retryCount = 0) => {
    if (!authUserId) {
      // console.warn(
      //   "🔧 Skipping call socket initialization: authUserId is undefined"
      // );
      return;
    }
    const socket = useAuthStore.getState().socket;
    const onlineUsers = useAuthStore.getState().onlineUsers; // Log onlineUsers
    console.log("🔧 Socket state for initialization:", {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      retryCount,
      onlineUsers,
    });
    if (!socket) {
      console.warn("🔧 No socket available for call listeners");
      if (retryCount < 3) {
        console.log(
          `🔧 Retrying call socket initialization (${retryCount + 1}/3)`
        );
        setTimeout(
          () => get().initializeCallSocket(authUserId, retryCount + 1),
          2000
        );
      } else {
        console.error(
          "🔧 Failed to initialize call socket: No socket after retries"
        );
        toast.error("Failed to initialize call connection");
      }
      return;
    }
    if (!socket.connected) {
      console.warn("🔧 Socket not connected for call listeners:", socket.id);
      if (retryCount < 3) {
        console.log(
          `🔧 Retrying call socket initialization (${retryCount + 1}/3)`
        );
        setTimeout(
          () => get().initializeCallSocket(authUserId, retryCount + 1),
          2000
        );
      } else {
        console.error(
          "🔧 Failed to initialize call socket: Socket not connected"
        );
        toast.error("Failed to initialize call connection");
      }
      return;
    }

    socket.on("call:ringing",
      ({ fromUserId, callType, fullName, profilePic }) => {
        // console.log(
        //   "📞 Incoming call from:",
        //   fromUserId,
        //   "type:",
        //   callType,
        //   "fullName:",
        //   fullName
        // );
        set({
          isReceivingCall: true,
          role: 'callee',
          callType,
          caller: { _id: fromUserId, fullName, profilePic },
          receiver: { _id: authUserId },
          reason: null,
        });
      }
    );

    socket.on("call:accepted", ({ byUserId }) => {
      // console.log("✅ Call accepted by:", byUserId);
      set({
        isCalling: false,
        isInCall: true,
        receiver: { _id: byUserId },
        reason: null,
      });
    });

    socket.on("call:declined", ({ byUserId }) => {
      // console.log("❌ Call declined by:", byUserId);
      set({
        isCalling: false,
        isReceivingCall: false,
        callType: null,
        caller: null,
        receiver: null,
        reason: "declined",
        role: null,
      });
    });

    socket.on("call:ended", ({ byUserId, reason }) => {
      // console.log(
      //   "📴 Call ended by:",
      //   byUserId,
      //   "reason:",
      //   reason || "no reason specified"
      // );
      set({
        isCalling: false,
        isReceivingCall: false,
        isInCall: false,
        callType: null,
        caller: null,
        receiver: null,
        webrtcOffer: null,
        webrtcAnswer: null,
        webrtcIceCandidate: null,
        role: null,
        reason,
      });
    });

    socket.on("webrtc:offer", ({ fromUserId, offer }) => {
      // console.log("📡 Received WebRTC offer from:", fromUserId);
      set({
        webrtcOffer: { fromUserId, offer },
        receiver: { _id: fromUserId },
      });
    });

    socket.on("webrtc:answer", ({ fromUserId, answer }) => {
      // console.log("📡 Received WebRTC answer from:", fromUserId);
      set({ webrtcAnswer: { fromUserId, answer } });
    });

    socket.on("webrtc:ice-candidate", ({ fromUserId, candidate }) => {
      // console.log("📡 Received ICE candidate from:", fromUserId);
      set({ webrtcIceCandidate: { fromUserId, candidate } });
    });

    socket.on("call:timeout", () => {
      // console.log("⏰ Call timed out");
      set({
        isCalling: false,
        isReceivingCall: false,
        callType: null,
        caller: null,
        receiver: null,
        reason: "timeout",
        role: null,
      });
    });

    socket.on("call:unavailable", ({ reason }) => {
      // console.log("🚫 Call unavailable:", reason);
      set({
        isCalling: false,
        isReceivingCall: false,
        isUnavailable: true,
        unavailableReason: reason,
        reason: "unavailable",
      });
    });
  },

  setSocket: (socket) => {
    console.log("🔌 Setting CallStore socket:", {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
    });
    set({ socket });
  },

  startCall: (toUser, callType) => {
    const socket = get().socket;
    const authUser = useAuthStore.getState().authUser;
    if (!socket || !socket.connected) {
      // console.error("🚫 Cannot start call: no connected socket");
      toast.error("Cannot start call: No connection");
      return;
    }
    if (!authUser) {
      // console.error("🚫 Cannot start call: no authUser");
      toast.error("Cannot start call: Not authenticated");
      return;
    }
    // console.log(
    //   "📞 Starting call to:",
    //   toUser._id,
    //   "type:",
    //   callType,
    //   "caller:",
    //   authUser.fullName
    // );
    set({
      isCalling: true,
      role: 'caller',
      callType,
      receiver: {
        _id: toUser._id,
        fullName: toUser.fullName,
        profilePic: toUser.profilePic,
      },
      reason: null,
    });
    socket.emit("call:request", {
      toUserId: toUser._id,
      callType,
      fullName: authUser.fullName,
      profilePic: authUser.profilePic,
    });
  },

  acceptCall: () => {
    const socket = get().socket;
    const { caller } = get();
    if (!socket || !socket.connected || !caller._id) {
      // console.error("🚫 Cannot accept call: no socket or caller");
      toast.error("Cannot accept call: No connection");
      return;
    }
    // console.log("✅ Accepting call from:", caller._id);
    set({
      isReceivingCall: false,
      isInCall: true,
      receiver: {
        _id: caller._id,
        fullName: caller.fullName,
        profilePic: caller.profilePic,
      },
      reason: null,
    });
    socket.emit("call:accept", { fromUserId: caller._id });
  },

  rejectCall: () => {
    const socket = get().socket;
    const { caller } = get();
    if (!socket || !socket.connected || !caller?._id) {
      // console.error("🚫 Cannot reject call: no socket or caller");
      toast.error("Cannot reject call: No connection");
      return;
    }
    // console.log("❌ Declining call from:", caller._id);
    set({
      isReceivingCall: false,
      callType: null,
      caller: null,

      receiver: null,
      reason: "declined",
    });
    socket.emit("call:decline", { fromUserId: caller._id });
  },

  endCall: () => {
    const socket = get().socket;
    const { receiver, caller, isCalling, isInCall, isReceivingCall } = get();
    const toUserId =
      isCalling || isInCall
        ? receiver?._id
        : isReceivingCall
        ? caller?._id
        : null;
    if (!socket || !socket.connected || !toUserId) {
      // console.error("🚫 Cannot end call: no socket or receiver");
      set({
        isCalling: false,
        isReceivingCall: false,
        isInCall: false,
        callType: null,
        caller: null,
        role: null,
        receiver: null,
        webrtcOffer: null,
        webrtcAnswer: null,
        webrtcIceCandidate: null,
        reason: null,
      });
      return;
    }
    // console.log("📴 Ending call with:", toUserId);
    set({
      isCalling: false,
      isReceivingCall: false,
      isInCall: false,
      callType: null,
      caller: null,
      role: null,
      receiver: null,
      webrtcOffer: null,
      webrtcAnswer: null,
      webrtcIceCandidate: null,
      reason: null,
    });
    socket.emit("call:end", { toUserId });
  },

  sendWebRTCOffer: (toUserId, offer) => {
    const socket = get().socket;
    if (!socket || !socket.connected) {
      // console.error("🚫 Cannot send WebRTC offer: no socket");
      toast.error("Cannot send call offer: No connection");
      return;
    }
    // console.log("📡 Emitting WebRTC offer to:", toUserId);
    socket.emit("webrtc:offer", { toUserId, offer });
  },

  sendWebRTCAnswer: (toUserId, answer) => {
    const socket = get().socket;
    if (!socket || !socket.connected) {
      // console.error("🚫 Cannot send WebRTC answer: no socket");
      toast.error("Cannot send call answer: No connection");
      return;
    }
    // console.log("📡 Emitting WebRTC answer to:", toUserId);
    socket.emit("webrtc:answer", { toUserId, answer });
  },

  sendWebRTCIceCandidate: (toUserId, candidate) => {
    const socket = get().socket;
    if (!socket || !socket.connected) {
      // console.error("🚫 Cannot send ICE candidate: no socket");
      toast.error("Cannot send ICE candidate: No connection");
      return;
    }
    // console.log("📡 Emitting ICE candidate to:", toUserId);
    socket.emit("webrtc:ice-candidate", { toUserId, candidate });
  },
}));
