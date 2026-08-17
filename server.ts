import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handler as geminiHandler } from "./netlify/functions/gemini.js";
import { handler as youtubeHandler } from "./netlify/functions/youtube.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for PWA validators and external tools
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Explicitly serve static public assets (icons, manifest, screenshots) with proper caching and types
  const publicPath = path.join(process.cwd(), 'public');
  app.use('/.well-known/web-app-origin-association', (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(publicPath, '.well-known', 'web-app-origin-association'));
  });

  app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else if (filePath.endsWith('sw.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('web-app-origin-association')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));

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

  // Secure YouTube proxy endpoint to keep API key hidden in backend
  app.all("/api/youtube", async (req, res) => {
    try {
      const event = {
        httpMethod: req.method,
        queryStringParameters: req.query,
        body: JSON.stringify(req.body || {}),
      };
      const context = {};
      const response = await youtubeHandler(event, context);
      
      res.status(response.statusCode || 200).send(response.body);
    } catch (error) {
      console.error("Error in YouTube API proxy:", error);
      res.status(500).json({ error: "Failed to proxy YouTube request" });
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
