import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import chatbotRoutes from "./routes/chatbot.js";
import userRoutes from "./routes/user.js"

dotenv.config();
const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", async (req, res) => {
  return res.send("hallo world");
});
app.use("/chatbot", chatbotRoutes);
app.use("/users", userRoutes);
// app.use("/images", express.static(path.join(__dirname, "public")))


const connectandrun = async () => {
  try {
    console.log(process.env.CONNECTION_STRING)
    await mongoose.connect(process.env.CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("berhasil connect ke database");
    app.listen(PORT, () => {
      console.log(`server run in localhost:${PORT}`);
    });
  } catch (error) {
    console.log("failed to connect to mongodb database", error);
    process.exit(1);
  }
};

connectandrun();