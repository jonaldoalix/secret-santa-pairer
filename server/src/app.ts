import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import type { AppConfig } from "./config.js";
import { createApiRouter } from "./routes.js";
import { RevealSession } from "./reveal.js";
import { museumDemoSeed, ParticipantStore } from "./store.js";

export interface AppBundle {
  app: Express;
  config: AppConfig;
  store: ParticipantStore;
  reveal: RevealSession;
}

/** Build the Express app without listening (tests + production entry share this). */
export function createApp(
  config: AppConfig,
  store = new ParticipantStore(),
  reveal = new RevealSession(),
): AppBundle {
  if (config.seedMuseumDemo && store.count() === 0) {
    store.reset(museumDemoSeed());
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });

  app.use("/api", createApiRouter(config, store, reveal));

  const clientDist = config.clientDist;
  if (fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        index: "index.html",
        setHeaders(res, filePath) {
          if (filePath.endsWith("sw.js") || filePath.includes("workbox")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return { app, config, store, reveal };
}
