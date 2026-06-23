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
import { employeeDocument, railwayEmployees } from "./data/mantapampalleEmployees.js";
import { stationCountExcludedStations } from "./data/stationRules.js";

export async function createApp() {
  await connectDatabase();
  await seedIfEmpty();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Server-Sent Events clients
  const sseClients = new Set();

  app.get("/api/events", (req, res) => {
    res.set({
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    });
    res.flushHeaders?.();
    res.write(`retry: 10000\n\n`);
    const client = res;
    sseClients.add(client);

    req.on("close", () => {
      sseClients.delete(client);
    });
  });

  function broadcastEvent(name, data) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    for (const client of sseClients) {
      try {
        client.write(`event: ${name}\ndata: ${payload}\n\n`);
      } catch (e) {
        // ignore
      }
    }
  }

  // Admin import endpoint to replace employee data (preserves LeaveRequest collection)
  app.post("/api/admin/import-employees", async (req, res) => {
    try {
      const list = Array.isArray(req.body) && req.body.length ? req.body : railwayEmployees;
      const employeeById = new Map();
      for (const record of list) {
        const employee = employeeDocument(record);
        if (!employeeById.has(employee.employeeId)) employeeById.set(employee.employeeId, employee);
      }
      const records = [...employeeById.values()];

      await Employee.deleteMany({});
      for (const employee of records) {
        await Station.updateOne(
          { stationName: employee.stationName },
          { $setOnInsert: { stationName: employee.stationName, stationMaster: "", totalEmployees: 0 } },
          { upsert: true },
        );
        await Employee.updateOne(
          { employeeId: employee.employeeId },
          { $set: employee, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );
      }

      // recompute station totals
      const stationsAll = await Station.find().lean();
      await Promise.all(
        stationsAll.map(async (st) => {
          const count = await employeeStats.getEmployeesCountForStation(st.stationName);
          return Station.findByIdAndUpdate(st._id, { totalEmployees: count });
        }),
      );

      // notify clients to refresh pages
      broadcastEvent("app:refresh", { pages: ["dashboard", "stations", "employees", "reports"] });

      res.json({ ok: true, imported: records.length });
    } catch (err) {
      console.error("Import failed", err);
      res.status(500).json({ error: String(err) });
    }
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

  app.use("/api", (_req, _res, next) => {
    next(notFound("API route not found"));
  });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "../../dist");

// Serve static frontend files
app.use(express.static(distPath));

// Serve React app for all non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

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
  const countedStationsFilter = { stationName: { $nin: stationCountExcludedStations } };
  const [totalStations, totalEmployees, employeesOnLeaveToday, pendingLeaveRequests, recentlyApproved] =
    await Promise.all([
      Station.countDocuments(countedStationsFilter),
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
    const countedStationsFilter = { stationName: { $nin: stationCountExcludedStations } };
    const [totalStations, totalEmployees, onLeaveToday, pendingRequests] = await Promise.all([
      Station.countDocuments(countedStationsFilter),
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
