import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { createServerlessExpress } from "vercel-serverless-express";

import chatbotRoutes from "../routes/chatbot.js";
import userRoutes from "../routes/user.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.get("/", (req, res) => res.send("Hello World from Vercel + Express!"));
app.use("/chatbot", chatbotRoutes);
app.use("/users", userRoutes);

// serve static images
app.use("/images", express.static(path.join(__dirname, "../public/images")));

let isConnected = false;

async function connectToDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("✅ Connected to MongoDB");
    isConnected = true;
  } catch (error) {
    console.error("❌ MongoDB connection failed", error);
  }
}

// koneksi sebelum setiap request
app.use(async (req, res, next) => {
  await connectToDB();
  next();
});

// export sebagai handler untuk vercel
export default createServerlessExpress(app);
