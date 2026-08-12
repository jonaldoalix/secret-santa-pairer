import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const { app } = createApp(config);

app.listen(config.port, () => {
  console.log(
    `Secret Santa Pairer listening on :${config.port} (provider=${config.notifyProvider}, museum=${config.museumMode})`,
  );
});
