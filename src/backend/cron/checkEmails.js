import cron from "node-cron";
import { checkAndProcessEmails } from "../services/emailService.js";

export function startEmailCron() {
  // Run immediately, then every minute
  checkAndProcessEmails().catch((e) => console.warn("Initial email check failed", e));
  const task = cron.schedule("*/1 * * * *", async () => {
    try {
      await checkAndProcessEmails();
    } catch (err) {
      console.warn("Email cron error", err);
    }
  });
  task.start();
  return task;
}
