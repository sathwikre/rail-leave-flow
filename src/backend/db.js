import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(config.mongoUri);
  return mongoose.connection;
}

export async function closeDatabase() {
  await mongoose.connection.close();
}
