import express from "express";
import cors from "cors";
import chatbotRoutes from "./routes/chatbot.js";

const app = express();
const PORT = 3000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", async (req, res) => {
    return res.send("hallo world")
})
app.use("/chatbot", chatbotRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
