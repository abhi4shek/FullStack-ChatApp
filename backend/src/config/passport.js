import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/user.model.js"; // adjust path if needed
import { generateToken } from "../lib/utils.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const mode = req.query.state;
        const isLoginAttempt = mode === "login";
        const isSignupAttempt = mode === "signup";
        const email = profile.emails?.[0]?.value || "";
        const googleId = profile.id;

        let user = await User.findOne({ googleId });

        if (!user) {
          user = await User.findOne({ email });

          if (isLoginAttempt) {
            if (user) {
              user.googleId = googleId;
              await user.save();
              return done(null, user);
            } else {
              return done(null, false, { message: "User not found" });
            }
          }

          if (isSignupAttempt) {
            if (user) {
              user.googleId = googleId;
              await user.save();
              return done(null, user);
            } else {
              user = await User.create({
                fullName: profile.displayName,
                email,
                googleId,
              });
              return done(null, user);
            }
          }

          return done(null, false, { message: "Unknown mode" });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
