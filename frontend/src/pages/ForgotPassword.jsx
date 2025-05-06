import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Loader2, Mail, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";


const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isVerifyingResetPasswordOtp, verifyOtp } = useAuthStore();
  const [step, setStep] = useState("email"); // 'email' or 'otp'
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", ""]);
  const inputsRef = useRef([]);
  const [timeLeft, setTimeLeft] = useState(900); // 900 seconds = 15 minutes
  useEffect(() => {
    let interval;
    if (step === "otp") {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            toast.error("OTP expired. Please request a new one.");
            setStep("email");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    // Update the OTP digits
    const updatedOtp = [...otpDigits];
    updatedOtp[index] = value;
    setOtpDigits(updatedOtp);

    // Move to next input
    if (value && index < 4) {
      inputsRef.current[index + 1]?.focus();
    }

    // If last digit is entered and all fields are filled
    if (index === 4 && updatedOtp.every((d) => d !== "")) {
      const combinedOtp = updatedOtp.join("");
      handleVerifyOtp(combinedOtp);
    }
  };
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const [formData, setFormData] = useState({
    email: "",
    verificationOtp: "",
  });
  const { forgotPassword, isSendingResetPasswordOtp } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) {
      const result = await forgotPassword(formData);
      if (result?.success) {
        toast.success(result.message); // message from backend
        setStep("otp");
      } else {
        toast.error(result.message);
      }
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email))
      return toast.error("Invalid email format");
    return true;
  };

  const handleVerifyOtp = async (otpValue) => {
    const result = await verifyOtp({
      email: formData.email,
      verificationOtp: otpValue,
    });
    if (result?.success) {
      toast.success("OTP verified successfully");
      //Redirect to reset password page
      navigate("/resetPassword", {
        state: {
          _id: result._id,
          fullName: result.fullName,
          email: result.email,
          profilePic: result.profilePic,
        },
      });
    } else {
      toast.error(result?.message || "Failed to verify OTP");
    }
  };

  const handleGoogleResponse = async (response) => {
    try {
      // Send the credential to your backend
      const res = await fetch(" ", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Login successful");
        // Optionally update auth store here
      } else {
        toast.error(data.message || "Google login failed");
      }
    } catch (err) {
      toast.error("Google login error");
    }
  };

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id:
          "476504211791-ictba5srrevdmf6hckgsjhi9cu3cajdv.apps.googleusercontent.com",
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  return (
    <div className="h-screen grid lg:grid-cols">
      {/* Left Side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-base-content/5 shadow-2xl p-4 rounded-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
              transition-colors"
              >
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Forgot Password?</h1>
              <p className="text-base-content/60">Recover your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10 rounded-2xl`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full rounded-2xl"
              disabled={isSendingResetPasswordOtp}
            >
              {isSendingResetPasswordOtp ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Otp Sending...
                </>
              ) : (
                "Send Otp"
              )}
            </button>
          </form>
          {step === "otp" && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Enter OTP Sent on your Email
                </span>
                <div className="text-center text-sm font-medium text-primary">
                  OTP expires in {formatTime(timeLeft)}
                </div>
              </label>
              <div className="flex gap-2 justify-center">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    ref={(el) => (inputsRef.current[index] = el)}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="input input-bordered w-12 h-12 text-center text-xl rounded-md"
                  />
                ))}
              </div>
              <button type="button" disabled={isVerifyingResetPasswordOtp}>
                {isVerifyingResetPasswordOtp ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Otp verifing...
                  </>
                ) : (
                  "Verify Otp"
                )}
              </button>
            </div>
          )}
          <div className="divider">OR</div>
          <a
            href="https://chatapp-abhi.up.railway.app/api/auth/google?mode=login"
            className="btn btn-outline w-full rounded-2xl"
          >
            {/* Google SVG Logo */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 533.5 544.3"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M533.5 278.4c0-17.4-1.4-34-4.1-50.2H272v95.1h147.4c-6.4 34.6-25.2 63.9-53.7 83.4v69.3h86.9c50.8-46.8 80-115.7 80-197.6z"
                fill="#4285F4"
              />
              <path
                d="M272 544.3c72.6 0 133.6-24.1 178.2-65.4l-86.9-69.3c-24.1 16.2-54.8 25.7-91.3 25.7-70 0-129.3-47.2-150.5-110.5H31.4v69.9C75.8 482.5 167.5 544.3 272 544.3z"
                fill="#34A853"
              />
              <path
                d="M121.5 324.8c-10-29.7-10-61.3 0-91l-90.1-69.9c-39.1 77.7-39.1 169.1 0 246.8l90.1-69.9z"
                fill="#FBBC05"
              />
              <path
                d="M272 107.7c39.5-.6 77.4 13.4 106.4 38.3l79.5-79.5C405.2 24.2 340.6 0 272 0 167.5 0 75.8 61.8 31.4 161.2l90.1 69.9C142.7 154.9 202 107.7 272 107.7z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </a>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="link link-primary">
                Create new account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Pattern
      <AuthImagePattern
        title={"Welcome back!"}
        subtitle={"Sign in to continue your conversations and catch up with your messages."}
      /> */}
    </div>
  );
};
export default ForgotPassword;
