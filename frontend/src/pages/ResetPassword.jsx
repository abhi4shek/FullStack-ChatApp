import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Camera, Mail, User, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const ResetPassword = () => {
  const { resetPassword, isResettingPassword } = useAuthStore();
  const { state: userData } = useLocation();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!userData) {
      toast.error("Unauthorized access. Please verify OTP again.");
      navigate("/forgotPassword");
    }
  }, [userData, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      return toast.error("Please fill in all fields.");
    }

    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    const result = await resetPassword({
      email: userData.email,
      newPassword: newPassword,
    });
    try {
      if (result?.success) {
        toast.success("Password reset successful.");
        navigate("/login");
      } else {
        toast.error(result.message || "Failed to reset password.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
    }
  };

  return (
    <div className="pt-17">
      <div className="max-w-xl mx-auto py-2">
        <div className="bg-base-300 rounded-xl p-5 space-y-2 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Reset Password</h1>
            <p className="mt-2">Set a new password for your account</p>
          </div>

          {/* avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={userData?.profilePic}
                alt="Profile"
                className="size-30 rounded-full object-cover border-2"
              />
              <div className="absolute bottom-0 right-0 bg-base-content p-2 rounded-full">
                <Camera className="w-5 h-5 text-base-200" />
              </div>
            </div>
            <p className="text-sm text-zinc-400">Resetting for: {userData?.email}</p>
          </div>

          {/* user info */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{userData?.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{userData?.email}</p>
            </div>
          </div>

          {/* password form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label font-medium">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                className="input input-bordered w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label font-medium">Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full rounded-2xl"
              disabled={isResettingPassword}
            >
              {isResettingPassword ? `<>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>`: "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
