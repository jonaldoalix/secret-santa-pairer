import fs from "node:fs";
import path from "node:path";
import express from "express";
import { loadConfig } from "./config.js";
import { createApiRouter } from "./routes.js";
import { museumDemoSeed, ParticipantStore } from "./store.js";

const config = loadConfig();
const store = new ParticipantStore();

if (config.seedMuseumDemo) {
  store.reset(museumDemoSeed());
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

app.use("/api", createApiRouter(config, store));

const clientDist = config.clientDist;
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: "index.html" }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(
    `Secret Santa Pairer listening on :${config.port} (provider=${config.notifyProvider}, museum=${config.museumMode})`,
  );
});
