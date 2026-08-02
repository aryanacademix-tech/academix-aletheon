import express from "express";
import { createServer as createViteServer } from "vite";
import { handler as geminiHandler } from "./netlify/functions/gemini.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Netlify Function endpoint for local development
  app.post("/api/gemini", async (req, res) => {
    try {
      const event = {
        httpMethod: req.method,
        body: JSON.stringify(req.body),
      };
      const context = {};
      const response = await geminiHandler(event, context);
      
      res.status(response.statusCode || 200).send(response.body);
    } catch (error) {
      console.error("Error in mock Netlify function:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("path");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
