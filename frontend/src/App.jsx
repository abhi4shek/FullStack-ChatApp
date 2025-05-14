import Navbar from "./components/Navbar";
import CallModal from "./components/CallModal";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useCallStore } from "./store/useCallStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers, connectSocket } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    console.log("🌟 App component mounted, authUser:", authUser?._id, "theme:", theme);
  }, [checkAuth]);

  useEffect(() => {
    if (authUser) {
      // console.log("🔌 Connecting socket for user:", authUser?._id);
    }
  }, [authUser, connectSocket]);

  useEffect(() => {
    const unsubscribe = useCallStore.subscribe((state) => {
      // console.log("🔄 App: CallStore state:", {
      //   isReceivingCall: state.isReceivingCall,
      //   isCalling: state.isCalling,
      //   isInCall: state.isInCall,
      //   caller: state.caller,
      // });
    });
    return () => {
      // console.log("🔄 App: Unsubscribing from CallStore");
      unsubscribe();
    };
  }, []);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/resetPassword" element={<ResetPassword />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>
      <div style={{ zIndex: 1000 }}>
        <CallModal />
      </div>
      <Toaster containerStyle={{ zIndex: 9999 }} />
    </div>
  );
};

export default App;