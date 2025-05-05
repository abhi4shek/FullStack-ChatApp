import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      minlength: 6,
      // Only required if not using Google authentication
      required: function () {
        return !this.googleId;
      },
    },
    profilePic: {
      type: String,
      default: "https://tabler.io/_next/image?url=%2Favatars%2Ftransparent%2F6bde7f630b3933ee1b92b0ec2df665c2.png&w=400&q=75",
    },
    googleId: {
      type: String,
      default: null, // only set for Google users
    },
    verificationOtp: Number,
  },
  { timestamps: true }
);

userSchema.methods.generateVerificationOtp = function () {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(1 + Math.random() * 9);
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return parseInt(firstDigit + remainingDigits);
  }
  const verificationOtp = generateRandomFiveDigitNumber();
  this.verificationOtp = verificationOtp;
  return verificationOtp;
};

const User = mongoose.model("User", userSchema);

export default User;