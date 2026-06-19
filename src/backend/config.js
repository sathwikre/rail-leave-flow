import "dotenv/config";

const required = ["MONGODB_URI"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  mongoUri: process.env.MONGODB_URI,
  port: Number(process.env.PORT ?? process.env.port ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mailUser: process.env.MAIL_USER,
  mailPass: process.env.MAIL_PASS,
  // Allow insecure TLS for IMAP during development (set to 'true' to accept self-signed)
  mailAllowInsecureTLS: process.env.MAIL_ALLOW_INSECURE_TLS === "true",
  monthlyLeaveLimit: Number(process.env.MONTHLY_LEAVE_LIMIT ?? 4),
};
