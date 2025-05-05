import express from "express";
import {
  signup,
  login,
  forgotPassword,
  verifyOtp,
  updatePassword,
  logout,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import passport from "passport";
import { generateToken } from "../lib/utils.js";

const router = express.Router();

router.get("/google", (req, res, next) => {
  const { mode } = req.query;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: mode, 
  })(req, res, next);
});
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login?error=google",
  }),
  (req, res) => {
    const token = generateToken(req.user._id, res);
    res.redirect(`http://localhost:5173/?token=${token}`);
  }
);
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyOtp", verifyOtp);
router.post("/resetPassword", updatePassword);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);

export default router;
