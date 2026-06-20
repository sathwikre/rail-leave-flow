import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDatabase } from "./db.js";
import { errorHandler, notFound } from "./errors.js";
import { LeaveRequest } from "./models/leaveRequestModel.js";
import { Employee } from "./models/employeeModel.js";
import { Station } from "./models/stationModel.js";
import { employeeRoutes } from "./routes/employeeRoutes.js";
import { leaveRoutes } from "./routes/leaveRoutes.js";
import { reportRoutes } from "./routes/reportRoutes.js";
import { stationRoutes } from "./routes/stationRoutes.js";
import { seedIfEmpty } from "./seed-data.js";
import { todayDateString } from "./controllers/leaveMetrics.js";
import * as employeeStats from "./services/employeeStatsService.js";

export async function createApp() {
  await connectDatabase();
  await seedIfEmpty();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/dashboard", dashboard);
  app.get("/api/dashboard/on-leave-today", onLeaveToday);
  app.get("/api/dashboard/on-leave", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const date = String(req.query.date ?? "").trim() || undefined;
    try {
      const list = await employeeStats.getEmployeesOnLeaveDetails(date);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get("/api/dashboard/sick-leaves", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const date = String(req.query.date ?? "").trim() || undefined;
    try {
      const list = await employeeStats.getSickLeavesList(date);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  app.get("/api/dashboard/stats", dashboardStats);
  app.get("/dashboard", dashboard);

  mountRoutes(app, "/api");
  mountRoutes(app, "");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, "../../dist");

  app.use(express.static(distPath));

  app.use("/api", (_req, _res, next) => {
    next(notFound("API route not found"));
  });

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.use(errorHandler);

  return app;
}

function mountRoutes(app, prefix) {
  app.use(`${prefix}/stations`, stationRoutes);
  app.use(`${prefix}/employees`, employeeRoutes);
  app.use(`${prefix}/leave`, leaveRoutes);
  app.use(`${prefix}/reports`, reportRoutes);

  // Compatibility for existing frontend code while pages are migrated.
  app.use(`${prefix}/leave-requests`, leaveRoutes);
}

async function dashboard(_req, res) {
  res.set("Cache-Control", "no-store");
  const today = todayDateString();
  const [totalStations, totalEmployees, employeesOnLeaveToday, pendingLeaveRequests, recentlyApproved] =
    await Promise.all([
      Station.countDocuments(),
      employeeStats.getTotalEmployees(),
      employeeStats.getEmployeesOnLeaveToday(),
      LeaveRequest.countDocuments({ status: "Pending" }),
      LeaveRequest.find({ status: "Approved" }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

  res.json({
    totalStations,
    totalEmployees,
    employeesOnLeaveToday,
    pendingLeaveRequests,
    recentlyApprovedLeaves: recentlyApproved.map((leave) => ({
      id: String(leave._id),
      employeeId: leave.employeeId,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      createdAt: leave.createdAt,
    })),
  });
}

async function onLeaveToday(_req, res) {
  res.set("Cache-Control", "no-store");
  try {
    const list = await employeeStats.getEmployeesOnLeaveTodayDetails();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

async function dashboardStats(_req, res) {
  res.set("Cache-Control", "no-store");
  try {
    const [totalStations, totalEmployees, onLeaveToday, pendingRequests] = await Promise.all([
      Station.countDocuments(),
      employeeStats.getTotalEmployees(),
      employeeStats.getEmployeesOnLeaveToday(),
      LeaveRequest.countDocuments({ status: "Pending" }),
    ]);

    // debug log for pending requests count
    console.log("pendingRequests=", await LeaveRequest.countDocuments({ status: "Pending" }));

    res.json({
      totalStations,
      totalEmployees,
      onLeaveToday,
      pendingRequests,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
