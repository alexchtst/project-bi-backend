import { HfInference } from "@huggingface/inference";
import express from "express";
import dotenv from "dotenv";
import { textContent } from "../data/text-content.js";

dotenv.config();

const router = express.Router();
const hf = new HfInference(process.env.HF_TOKEN);

function chunkText(text, chunkSize = 800) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";
  
  sentences.forEach(sentence => {
    if ((currentChunk + sentence).length < chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  });
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function getEmbedding(text) {
  try {
    const response = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    });
    return response;
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let documentChunks = [];
let chunkEmbeddings = [];
let isInitialized = false;

async function initializeEmbeddings() {
  if (isInitialized) return;
  
  console.log("Initializing document embeddings...");
  documentChunks = chunkText(textContent);
  
  for (let i = 0; i < documentChunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${documentChunks.length}`);
    const embedding = await getEmbedding(documentChunks[i]);
    chunkEmbeddings.push({
      text: documentChunks[i],
      embedding: embedding
    });
    
    // Small delay untuk avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isInitialized = true;
  console.log("Embeddings initialized!");
}

async function retrieveRelevantChunks(query, topK = 3) {
  // Pastikan embeddings sudah diinisialisasi
  if (!isInitialized) {
    await initializeEmbeddings();
  }
  
  const queryEmbedding = await getEmbedding(query);
  
  const scoredChunks = chunkEmbeddings.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  scoredChunks.sort((a, b) => b.score - a.score);
  
  return scoredChunks.slice(0, topK);
}

router.post("/", async (req, res) => {
  const { message } = req.body;

  try {
    const relevantChunks = await retrieveRelevantChunks(message);
    const context = relevantChunks
      .map((chunk, idx) => `[Context ${idx + 1}]:\n${chunk.text}`)
      .join("\n\n");
    
    const augmentedPrompt = `You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, you can use your general knowledge but mention that.

Context:
${context}

User Question: ${message}

Answer:`;

    // Gunakan Hugging Face Chat Completion
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [
        {
          role: "user",
          content: augmentedPrompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({
      reply: response.choices[0].message.content,
      relevantChunks: relevantChunks.map(c => ({
        text: c.text.substring(0, 100) + "...",
        score: c.score.toFixed(3)
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error connecting to LLM" });
  }
});

// Export fungsi init untuk dipanggil dari server.js
export { initializeEmbeddings };
export default router;