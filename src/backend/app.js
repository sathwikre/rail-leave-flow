import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { collections, connectDatabase } from "./db.js";
import { ApiError, asyncHandler, errorHandler, notFound } from "./errors.js";
import { buildSeedData } from "./seed-data.js";
import {
  attendanceUpsertSchema,
  emailSchema,
  employeeCreateSchema,
  employeeUpdateSchema,
  leaveRequestCreateSchema,
  leaveRequestUpdateSchema,
  leaveStatusSchema,
  settingsUpdateSchema,
} from "./validation.js";

const DEFAULT_SETTINGS = {
  monthlyLeaveLimit: config.monthlyLeaveLimit,
  autoApproveWithinLimit: false,
  showRecommendations: true,
  notifications: {
    whatsapp: true,
    emailDigest: true,
    sms: false,
    weeklyReport: true,
  },
};

export async function createApp() {
  const db = await connectDatabase();
  await seedIfEmpty(db);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, environment: config.nodeEnv });
  });

  app.get(
    "/api/dashboard",
    asyncHandler(async (_req, res) => {
      const { employees, leaveRequests } = collections(db);
      const today = new Date().toISOString().slice(0, 10);
      const [totalWorkers, onLeaveToday, pendingRequests, approvedThisMonth, rejectedThisMonth] =
        await Promise.all([
          employees.countDocuments({ active: { $ne: false } }),
          leaveRequests.countDocuments({
            status: "approved",
            fromDate: { $lte: today },
            toDate: { $gte: today },
          }),
          leaveRequests.countDocuments({ status: "pending" }),
          leaveRequests.countDocuments({ status: "approved" }),
          leaveRequests.countDocuments({ status: "rejected" }),
        ]);

      res.json({
        totalWorkers,
        presentToday: Math.max(totalWorkers - onLeaveToday, 0),
        onLeaveToday,
        pendingRequests,
        approvedThisMonth,
        rejectedThisMonth,
      });
    }),
  );

  app.get(
    "/api/employees",
    asyncHandler(async (req, res) => {
      const { employees } = collections(db);
      const filter = {};
      const q = String(req.query.q ?? "").trim();
      const department = String(req.query.department ?? "").trim();

      if (department && department !== "all") filter.department = department;
      if (q) {
        filter.$or = [
          { id: { $regex: escapeRegExp(q), $options: "i" } },
          { name: { $regex: escapeRegExp(q), $options: "i" } },
          { phone: { $regex: escapeRegExp(q), $options: "i" } },
        ];
      }

      const data = await employees
        .find(filter, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      res.json(data);
    }),
  );

  app.post(
    "/api/employees",
    asyncHandler(async (req, res) => {
      const payload = employeeCreateSchema.parse(req.body);
      const now = new Date();
      const document = {
        ...payload,
        id: payload.id ?? (await nextEmployeeId(db)),
        createdAt: now,
        updatedAt: now,
      };
      await collections(db).employees.insertOne(document);
      res.status(201).json(stripMongoId(document));
    }),
  );

  app.get(
    "/api/employees/:id",
    asyncHandler(async (req, res) => {
      const employee = await collections(db).employees.findOne(
        { id: req.params.id },
        { projection: { _id: 0 } },
      );
      if (!employee) throw notFound("Employee not found");
      res.json(employee);
    }),
  );

  app.patch(
    "/api/employees/:id",
    asyncHandler(async (req, res) => {
      const payload = employeeUpdateSchema.parse(req.body);
      const result = await collections(db).employees.findOneAndUpdate(
        { id: req.params.id },
        { $set: { ...payload, updatedAt: new Date() } },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result?.value) throw notFound("Employee not found");
      res.json(stripMongoId(result.value));
    }),
  );

  app.delete(
    "/api/employees/:id",
    asyncHandler(async (req, res) => {
      const result = await collections(db).employees.updateOne(
        { id: req.params.id },
        { $set: { active: false, updatedAt: new Date() } },
      );
      if (!result.matchedCount) throw notFound("Employee not found");
      res.status(204).send();
    }),
  );

  app.get(
    "/api/leave-requests",
    asyncHandler(async (req, res) => {
      const filter = {};
      const status = String(req.query.status ?? "all");
      const q = String(req.query.q ?? "").trim();

      if (status !== "all") filter.status = status;
      if (q) {
        filter.$or = [
          { id: { $regex: escapeRegExp(q), $options: "i" } },
          { employeeId: { $regex: escapeRegExp(q), $options: "i" } },
          { employeeName: { $regex: escapeRegExp(q), $options: "i" } },
        ];
      }

      const data = await collections(db)
        .leaveRequests.find(filter, { projection: { _id: 0 } })
        .sort({ requestDate: -1 })
        .toArray();
      res.json(data);
    }),
  );

  app.post(
    "/api/leave-requests",
    asyncHandler(async (req, res) => {
      const payload = await normalizeLeavePayload(db, leaveRequestCreateSchema.parse(req.body));
      const now = new Date();
      const document = {
        id: await nextLeaveRequestId(db),
        ...payload,
        createdAt: now,
        updatedAt: now,
      };

      await collections(db).leaveRequests.insertOne(document);
      res.status(201).json(stripMongoId(document));
    }),
  );

  app.get(
    "/api/leave-requests/:id",
    asyncHandler(async (req, res) => {
      const request = await collections(db).leaveRequests.findOne(
        { id: req.params.id },
        { projection: { _id: 0 } },
      );
      if (!request) throw notFound("Leave request not found");
      res.json(request);
    }),
  );

  app.patch(
    "/api/leave-requests/:id",
    asyncHandler(async (req, res) => {
      const payload = leaveRequestUpdateSchema.parse(req.body);
      const normalized = Object.keys(payload).length
        ? await normalizeLeavePayload(db, payload)
        : payload;
      const result = await collections(db).leaveRequests.findOneAndUpdate(
        { id: req.params.id },
        { $set: { ...normalized, updatedAt: new Date() } },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result?.value) throw notFound("Leave request not found");
      res.json(stripMongoId(result.value));
    }),
  );

  app.patch(
    "/api/leave-requests/:id/status",
    asyncHandler(async (req, res) => {
      const { status } = leaveStatusSchema.parse(req.body);
      const result = await collections(db).leaveRequests.findOneAndUpdate(
        { id: req.params.id },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after", projection: { _id: 0 } },
      );
      if (!result?.value) throw notFound("Leave request not found");
      res.json(stripMongoId(result.value));
    }),
  );

  app.get(
    "/api/leave-requests/:id/recommendation",
    asyncHandler(async (req, res) => {
      const { leaveRequests } = collections(db);
      const request = await leaveRequests.findOne(
        { id: req.params.id },
        { projection: { _id: 0 } },
      );
      if (!request) throw notFound("Leave request not found");
      res.json(await recommendationFor(db, request.employeeId, request.days));
    }),
  );

  app.get(
    "/api/employees/:id/leave-history",
    asyncHandler(async (req, res) => {
      const history = await collections(db)
        .leaveRequests.find({ employeeId: req.params.id }, { projection: { _id: 0 } })
        .sort({ fromDate: -1 })
        .toArray();
      res.json(history);
    }),
  );

  app.get(
    "/api/attendance",
    asyncHandler(async (req, res) => {
      const employeeId = String(req.query.employeeId ?? "").trim();
      const date = String(req.query.date ?? "").trim();

      if (date) {
        const filter = employeeId ? { employeeId, date } : { date };
        const records = await collections(db)
          .attendance.find(filter, { projection: { _id: 0 } })
          .sort({ employeeId: 1 })
          .toArray();
        res.json(records);
        return;
      }

      if (!employeeId) throw new ApiError(400, "employeeId is required");

      const year = Number(req.query.year ?? new Date().getFullYear());
      const month = Number(req.query.month ?? new Date().getMonth() + 1);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = `${year}-${String(month).padStart(2, "0")}-31`;

      const records = await collections(db)
        .attendance.find(
          { employeeId, date: { $gte: start, $lte: end } },
          { projection: { _id: 0 } },
        )
        .sort({ date: 1 })
        .toArray();
      res.json(records);
    }),
  );

  app.put(
    "/api/attendance",
    asyncHandler(async (req, res) => {
      // normalize legacy 'absent' -> 'leave' before validation
      if (req.body && req.body.status === "absent") req.body.status = "leave";
      const payload = attendanceUpsertSchema.parse(req.body);
      const result = await collections(db).attendance.findOneAndUpdate(
        { employeeId: payload.employeeId, date: payload.date },
        { $set: { ...payload, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, returnDocument: "after", projection: { _id: 0 } },
      );

      // Recompute monthly leave count for the employee and update employee document
      try {
        const [year, month] = payload.date.split("-").map((v) => Number(v));
        const start = `${year}-${String(month).padStart(2, "0")}-01`;
        const end = `${year}-${String(month).padStart(2, "0")}-31`;
        const leaveCount = await collections(db).attendance.countDocuments({
          employeeId: payload.employeeId,
          date: { $gte: start, $lte: end },
          status: "leave",
        });

        const updatedEmployee = await collections(db).employees.findOneAndUpdate(
          { id: payload.employeeId },
          { $set: { leaveUsedThisMonth: leaveCount, updatedAt: new Date() } },
          { returnDocument: "after", projection: { _id: 0 } },
        );

        res.json({ attendance: stripMongoId(result.value), employee: stripMongoId(updatedEmployee.value) });
        return;
      } catch (err) {
        console.warn("Failed to update employee leaveUsedThisMonth", err);
      }

      res.json(stripMongoId(result.value));
    }),
  );

  app.get(
    "/api/reports",
    asyncHandler(async (_req, res) => {
      res.json(await buildReports(db));
    }),
  );

  app.get(
    "/api/settings",
    asyncHandler(async (_req, res) => {
      res.json(await getSettings(db));
    }),
  );

  app.patch(
    "/api/settings",
    asyncHandler(async (req, res) => {
      const payload = settingsUpdateSchema.parse(req.body);
      const settings = { ...(await getSettings(db)), ...payload, updatedAt: new Date() };
      await collections(db).settings.updateOne(
        { key: "app" },
        { $set: settings },
        { upsert: true },
      );
      res.json(settings);
    }),
  );

  app.post(
    "/api/notifications/email",
    asyncHandler(async (req, res) => {
      const payload = emailSchema.parse(req.body);
      if (!config.mailUser || !config.mailPass)
        throw new ApiError(503, "Mail credentials are not configured");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: config.mailUser, pass: config.mailPass },
      });

      const info = await transporter.sendMail({
        from: config.mailUser,
        ...payload,
      });
      res.status(202).json({ messageId: info.messageId });
    }),
  );

  // Serve frontend production build (dist/) for non-API routes
  // Compute __dirname for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, "../../dist");

  // Serve static assets from the frontend build
app.use(express.static(distPath));

app.use("/api", (_req, _res, next) => {
  next(notFound("API route not found"));
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.use(errorHandler);

  app.use(errorHandler);

  return app;
}

async function seedIfEmpty(db) {
  const { employees, leaveRequests, settings } = collections(db);
  const employeeCount = await employees.countDocuments();

  if (employeeCount === 0) {
    const seed = buildSeedData();
    await employees.insertMany(seed.employees);
    await leaveRequests.insertMany(seed.leaveRequests);
  }

  await settings.updateOne(
    { key: "app" },
    {
      $setOnInsert: {
        key: "app",
        ...DEFAULT_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

async function normalizeLeavePayload(db, payload) {
  const normalized = { ...payload };

  if (payload.employeeId) {
    const employee = await collections(db).employees.findOne(
      { id: payload.employeeId },
      { projection: { _id: 0 } },
    );
    if (!employee) throw notFound("Employee not found");
    normalized.employeeName = employee.name;
  }

  if (payload.fromDate && payload.toDate && !payload.days) {
    normalized.days = diffDays(payload.fromDate, payload.toDate);
  }

  if (!normalized.requestDate) {
    normalized.requestDate = new Date().toISOString().slice(0, 10);
  }

  return normalized;
}

async function recommendationFor(db, employeeId, requestedDays) {
  const [employee, settings] = await Promise.all([
    collections(db).employees.findOne({ id: employeeId }, { projection: { _id: 0 } }),
    getSettings(db),
  ]);
  if (!employee) throw notFound("Employee not found");

  const remaining = settings.monthlyLeaveLimit - employee.leaveUsedThisMonth;
  if (requestedDays <= remaining) {
    return {
      decision: "APPROVE",
      reason: `Within monthly limit. ${remaining} day(s) remaining before this request.`,
    };
  }

  return {
    decision: "REJECT",
    reason: `Exceeds monthly limit of ${settings.monthlyLeaveLimit} days. Only ${remaining} day(s) remaining.`,
  };
}

async function buildReports(db) {
  const { employees, leaveRequests } = collections(db);
  const [requests, employeeList] = await Promise.all([
    leaveRequests.find({}, { projection: { _id: 0 } }).toArray(),
    employees.find({}, { projection: { _id: 0 } }).toArray(),
  ]);

  const monthly = new Map();
  const department = new Map();
  const employeeById = new Map(employeeList.map((employee) => [employee.id, employee]));

  for (const request of requests) {
    const month = request.fromDate.slice(0, 7);
    monthly.set(month, monthly.get(month) ?? { month, approved: 0, rejected: 0, pending: 0 });
    monthly.get(month)[request.status] += 1;

    const employee = employeeById.get(request.employeeId);
    const departmentName = employee?.department ?? "Unknown";
    department.set(departmentName, (department.get(departmentName) ?? 0) + request.days);
  }

  const topLeaveTakers = employeeList
    .map((employee) => ({
      name: employee.name,
      leaves: requests
        .filter((request) => request.employeeId === employee.id && request.status === "approved")
        .reduce((sum, request) => sum + request.days, 0),
    }))
    .sort((a, b) => b.leaves - a.leaves)
    .slice(0, 6);

  return {
    totals: {
      total: requests.length,
      approved: requests.filter((request) => request.status === "approved").length,
      rejected: requests.filter((request) => request.status === "rejected").length,
      pending: requests.filter((request) => request.status === "pending").length,
    },
    monthlyStats: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
    departmentStats: Array.from(department.entries()).map(([departmentName, leaves]) => ({
      department: departmentName,
      leaves,
    })),
    topLeaveTakers,
  };
}

async function getSettings(db) {
  const document = await collections(db).settings.findOne(
    { key: "app" },
    { projection: { _id: 0 } },
  );
  return document ?? { key: "app", ...DEFAULT_SETTINGS };
}

async function nextLeaveRequestId(db) {
  const latest = await collections(db)
    .leaveRequests.find({ id: /^LR-/ })
    .sort({ id: -1 })
    .limit(1)
    .next();
  const nextNumber = latest ? Number(latest.id.replace("LR-", "")) + 1 : 2001;
  return `LR-${String(nextNumber).padStart(4, "0")}`;
}

async function nextEmployeeId(db) {
  const latest = await collections(db)
    .employees.find({ id: /^RW-/ })
    .sort({ id: -1 })
    .limit(1)
    .next();
  const nextNumber = latest ? Number(latest.id.replace("RW-", "")) + 1 : 1001;
  return `RW-${String(nextNumber).padStart(4, "0")}`;
}

function diffDays(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  if (to < from) throw new ApiError(400, "toDate must be on or after fromDate");
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

function stripMongoId(document) {
  const { _id, ...rest } = document;
  return rest;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
