import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useCallStore } from "./useCallStore";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isSendingResetPasswordOtp: false,
  isVerifyingResetPasswordOtp: false,
  isResettingPassword: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Please login or Signup first.");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  forgotPassword: async (data) => {
    set({ isSendingResetPasswordOtp: true });
    try {
      const res = await axiosInstance.post("/auth/forgotPassword", data);

      // Use the actual backend message
      return {
        success: true,
        message: res.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to send reset password OTP",
      };
    } finally {
      set({ isSendingResetPasswordOtp: false });
    }
  },

  verifyOtp: async (data) => {
    set({ isVerifyingResetPasswordOtp: true });
    try {
      const res = await axiosInstance.post("/auth/verifyOtp", data);
      return { success: true, ...res.data }; // <-- add this
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
      return { success: false, message: error.response?.data?.message };
    } finally {
      set({ isVerifyingResetPasswordOtp: false });
    }
  },

  resetPassword: async (data) => {
    set({ isResettingPassword: true });
    try {
      const res = await axiosInstance.post("/auth/resetPassword", data);
      toast.success("Password reset successfully");
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      return { success: false, message: error.response?.data?.message };
    } finally {
      set({ isResettingPassword: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: async () => {
    const authUser = get().authUser;
    if (!authUser?._id) {
      console.log("🔌 Skipping socket connection: authUser not set");
      return;
    }

    const existingSocket = get().socket;
    if (existingSocket && existingSocket.connected) {
      console.log("🔌 Existing socket already connected:", existingSocket.id);
      return;
    }
    if (existingSocket) {
      console.log(
        "🔌 Disconnecting stale socket:",
        existingSocket.id || "unknown"
      );
      existingSocket.disconnect();
      set({ socket: null });
    }

    console.log("🔌 Creating new socket for user:", authUser._id);
    const socket = io(BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: { userId: authUser._id },
      transports: ["websocket"], // Avoid polling to bypass CSP
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      set({ socket });
      useCallStore.getState().setSocket(socket);
      useCallStore.getState().initializeCallSocket(authUser._id);
      socket.emit("getOnlineUsers");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket connect error:", error.message);
    });

    socket.on("onlineUsers", (users) => {
      set({ onlineUsers: users });
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected, reason:", reason);
      set({ socket: null, onlineUsers: [] });
      useCallStore.getState().setSocket(null);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      console.log("🔌 Disconnecting socket:", socket.id);
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
      useCallStore.getState().setSocket(null);
    }
  },
}));
