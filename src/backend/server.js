import { createApp } from "./app.js";
import { closeDatabase } from "./db.js";
import { config } from "./config.js";

const app = await createApp();

const server = app.listen(config.port, () => {
  console.log(`Backend API running on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
