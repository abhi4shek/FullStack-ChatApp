import cloudinary from "../lib/cloudinary.js";
import {
  generateToken,
  generateVerificationOtpEmailTemplate,
  sendEmail,
} from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";

export const signup = async (req, res) => {
  const { fullName, email, password, googleId } = req.body;
  try {
    if (!fullName || !email || (!password && !googleId)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // If using password, ensure it's valid
    if (password && password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = password
      ? await bcrypt.hash(password, await bcrypt.genSalt(10))
      : null;

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      googleId: googleId || null,
    });

    await newUser.save();

    // Generate JWT token
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // If password is provided, validate it
    if (password && !user.googleId) {
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ message: "No User is found With this email." });
    }

    // generateTokenOtp(user._id, res);

    const verificationOtp = await user.generateVerificationOtp();
    await user.save();

    const message = generateVerificationOtpEmailTemplate(verificationOtp);

    await sendEmail({
      email: user.email,
      subject: "Chat App Otp for password recovery",
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email send to ${email} successfully`,
    });
  } catch (error) {
    console.log("Error in sending verification otp.", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email,verificationOtp } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ message: "No User is found With this email." });
    }

    //  generateTokenResetpassword(user._id, res);

    const isOtpCorrect = Number(verificationOtp) === user.verificationOtp;
    if (!isOtpCorrect) {
      return res.status(400).json({ message: "Wrong/Invalid Otp" });
    }else {
      user.verificationOtp = null;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: `Otp verified successfully`,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
    console.log("returned uder details", res);
  } catch (error) {
    console.log("Error in sending verification otp.", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;
  console.log("Received password reset request:", req.body);


  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: "No user found with this email." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    user.password = hashedPassword;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
      fullName: user.fullName,
      email: user.email,
    });
  } catch (error) {
    console.error("Error in resetting password:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in update profile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
