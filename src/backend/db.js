import { MongoClient } from "mongodb";
import { config } from "./config.js";

let client;
let database;

export async function connectDatabase() {
  if (database) return database;

  client = new MongoClient(config.mongoUri);
  await client.connect();
  database = client.db();
  await ensureIndexes(database);
  return database;
}

export function collections(db) {
  return {
    employees: db.collection("employees"),
    leaveRequests: db.collection("leaveRequests"),
    attendance: db.collection("attendance"),
    settings: db.collection("settings"),
  };
}

export async function closeDatabase() {
  await client?.close();
  client = undefined;
  database = undefined;
}

async function ensureIndexes(db) {
  const { employees, leaveRequests, attendance, settings } = collections(db);

  await Promise.all([
    employees.createIndex({ id: 1 }, { unique: true }),
    employees.createIndex({ name: "text", department: "text", id: "text" }),
    leaveRequests.createIndex({ id: 1 }, { unique: true }),
    leaveRequests.createIndex({ employeeId: 1, fromDate: 1 }),
    leaveRequests.createIndex({ status: 1, requestDate: -1 }),
    attendance.createIndex({ employeeId: 1, date: 1 }, { unique: true }),
    settings.createIndex({ key: 1 }, { unique: true }),
  ]);
}
