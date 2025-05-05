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

app.use(
    cors({
    origin: "https://fullstack-chatapp-lix7.onrender.com",
    credentials: true,
}));

app.use(passport.initialize());
app.use("/api/auth", authRouters);
app.use("/api/messages", messageRouters);

 if(process.env.NODE_ENV==='production'){
    app.use(express.static(path.join(__dirname, '/frontend/dist')));

    app.get('*', (req, res) =>{
        res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
    });
  }

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on" + PORT);
  connectDB();
});