import { OpenAI } from "openai";
import express from "express";
import dotenv from "dotenv";
import { documentText } from "../data/text-content.js";

dotenv.config();

const router = express.Router();

// helper: simple cosine similarity function
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((acc, v, i) => acc + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, v) => acc + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((acc, v) => acc + v * v, 0));
  return dot / (magA * magB);
}

// simple embedding via HF API (or use OpenAI if preferred)
async function getEmbedding(client, text) {
  const response = await client.embeddings.create({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    input: text,
  });
  return response.data[0].embedding;
}

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: process.env.HF_TOKEN,
    });

    // Step 1: split document
    const chunks = documentText.split(/\.\s+/);

    // Step 2: embed user query and each chunk
    const queryEmbedding = await getEmbedding(client, message);

    const scoredChunks = [];
    for (const chunk of chunks) {
      const chunkEmbedding = await getEmbedding(client, chunk);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      scoredChunks.push({ chunk, score });
    }

    // Step 3: sort and take top 2 relevant chunks
    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((c) => c.chunk)
      .join(". ");

    // Step 4: augment message
    const augmentedPrompt = `
Gunakan konteks berikut untuk menjawab pertanyaan pengguna.

Konteks:
${topChunks}

Pertanyaan:
${message}
    `;

    // Step 5: send to LLM
    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [
        { role: "system", content: "Kamu adalah asisten yang membantu menjawab berdasarkan konteks dokumen." },
        { role: "user", content: augmentedPrompt },
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
      contextUsed: topChunks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error connecting to LLM" });
  }
});

export default router;
