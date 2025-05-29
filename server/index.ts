import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test route mobile diretto
  app.get('/test', (req, res) => {
    res.send('<h1>✅ Test route funziona!</h1><p><a href="/mobile">Vai alla versione mobile</a></p>');
  });

  // Route per iPad - versione semplice garantita
  app.get('/ipad', (req, res) => {
    const filePath = path.resolve(process.cwd(), 'client/ipad.html');
    res.sendFile(filePath);
  });
  
  app.get('/mobile', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FoodTracker Mobile</title>
    <style>
        body { font-family: system-ui; background: linear-gradient(135deg, #667eea, #764ba2); color: white; margin: 0; padding: 20px; min-height: 100vh; }
        .container { max-width: 400px; margin: 0 auto; text-align: center; }
        .header { margin-bottom: 30px; }
        .btn { background: rgba(255,255,255,0.2); border: none; border-radius: 8px; padding: 12px 24px; color: white; cursor: pointer; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍎 FoodTracker Mobile</h1>
            <p>Versione mobile funzionante!</p>
        </div>
        <button class="btn" onclick="window.location.href='/'">🔄 Versione Desktop</button>
        <p>✅ La pagina mobile funziona correttamente!</p>
    </div>
</body>
</html>`);
  });

  // Register API routes FIRST, before Vite setup
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
