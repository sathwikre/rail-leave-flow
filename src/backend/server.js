import { createApp } from "./app.js";
import { closeDatabase } from "./db.js";
import { config } from "./config.js";
import { startEmailCron } from "./cron/checkEmails.js";

const app = await createApp();

const server = app.listen(config.port, () => {
  console.log(`Backend API running on http://localhost:${config.port}`);
});

// Start email cron if credentials are configured
if (config.mailUser && config.mailPass) {
  try {
    startEmailCron();
    console.log("Email cron started");
  } catch (err) {
    console.warn("Failed to start email cron", err);
  }
}

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
