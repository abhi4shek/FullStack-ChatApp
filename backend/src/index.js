import express from "express";
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'
import cors from 'cors';
import path from 'path';

import { connectDB } from "./lib/db.js";
import authRouters from "./routers/auth.route.js";
import messageRouters from "./routers/message.route.js"
import { app, server } from "./lib/socket.js";
import passport from 'passport';
import "./config/passport.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve()

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  // "http://172.16.2.146:5173",
];
app.use(
    cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(passport.initialize());
app.use("/api/auth", authRouters);
app.use("/api/messages", messageRouters);

// if(process.env.NODE_ENV==='production'){
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));

    app.get('*', (req, res) =>{
      res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
// }

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:" + PORT);
  connectDB();
});