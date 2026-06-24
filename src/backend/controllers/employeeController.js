import { Employee } from "../models/employeeModel.js";
import { DesignationHistory } from "../models/designationHistoryModel.js";
import { EmployeeRemark } from "../models/employeeRemarkModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";
import { lastLeaveDate, leavesUsedThisMonth, MONTHLY_LEAVE_LIMIT } from "./leaveMetrics.js";

const remarkTypes = ["Excellent", "Good", "General", "Warning", "Disciplinary"];

export async function getEmployees(req, res) {
  const q = String(req.query.q ?? "").trim();
  const stationId = String(req.query.stationId ?? "").trim();
  const filter = {};

  if (stationId && stationId !== "all") {
    const station = await Station.findById(stationId).select("stationName").lean();
    filter.stationName = station?.stationName ?? "__missing_station__";
  }
  if (q) {
    filter.$or = [
      { employeeId: { $regex: escapeRegExp(q), $options: "i" } },
      { name: { $regex: escapeRegExp(q), $options: "i" } },
      { phone: { $regex: escapeRegExp(q), $options: "i" } },
      { designation: { $regex: escapeRegExp(q), $options: "i" } },
    ];
  }

  // Ensure only complete employee records are returned
  const required = {
    employeeId: { $exists: true, $ne: "" },
    stationName: { $exists: true, $ne: "" },
    designation: { $exists: true, $ne: "" },
    name: { $exists: true, $ne: "" },
  };

  Object.assign(filter, required);

  const employees = await Employee.find(filter).sort({ employeeId: 1 }).lean();
  res.json(employees.map(formatEmployee));
}

export async function getEmployeeById(req, res) {
  const employee = await Employee.findOne({ employeeId: req.params.id }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  // Treat incomplete records as not found
  if (!employee.employeeId || !employee.stationName || !employee.designation) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const history = await LeaveRequest.find({ employeeId: employee.employeeId })
    .sort({ fromDate: -1 })
    .lean();
  const leavesUsed = await leavesUsedThisMonth(employee.employeeId);
  const totalLeavesTaken = await LeaveRequest.countDocuments({ employeeId: employee.employeeId, status: "Approved" });
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const onLeaveNow = await LeaveRequest.exists({ employeeId: employee.employeeId, status: "Approved", fromDate: { $lte: todayStr }, toDate: { $gte: todayStr } });

  res.json({
    ...formatEmployee(employee),
    leavesUsedThisMonth: leavesUsed,
    remainingLeaves: Math.max(0, MONTHLY_LEAVE_LIMIT - leavesUsed),
    lastLeaveDate: lastLeaveDate(history),
    leaveHistory: history.map(formatLeave),
    monthlyLeaveLimitExceeded: leavesUsed > MONTHLY_LEAVE_LIMIT,
    exceededLimit: leavesUsed > MONTHLY_LEAVE_LIMIT,
    totalLeavesTaken,
    currentStatus: onLeaveNow ? "On Leave" : "Present",
  });
}

export async function getEmployeesByStation(req, res) {
  console.log("getEmployeesByStation called with stationId:", req.params.stationId);
  const employees = await Employee.find({
    stationName: (await Station.findById(req.params.stationId).select("stationName").lean())?.stationName,
    employeeId: { $exists: true, $ne: "" },
    name: { $exists: true, $ne: "" },
    designation: { $exists: true, $ne: "" },
  })
    .sort({ employeeId: 1 })
    .lean();
  console.log(`getEmployeesByStation found ${employees.length} employees`);
  res.json(employees.map(formatEmployee));
}

export async function getEmployeeLeaves(req, res) {
  const empId = req.params.id;
  const employee = await Employee.findOne({ employeeId: empId }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const history = await LeaveRequest.find({ employeeId: empId }).sort({ fromDate: -1 }).lean();
  const leavesUsed = await leavesUsedThisMonth(empId);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const onLeaveNow = await LeaveRequest.exists({ employeeId: empId, status: "Approved", fromDate: { $lte: todayStr }, toDate: { $gte: todayStr } });

  res.json({
    employeeId: employee.employeeId,
    employeeName: employee.name,
    designation: employee.designation,
    stationName: employee.stationName,
    phone: employee.phone,
    dob: employee.dob ? (new Date(employee.dob)).toISOString().slice(0,10) : null,
    doa: employee.doa ? (new Date(employee.doa)).toISOString().slice(0,10) : null,
    doj: employee.doj ? (new Date(employee.doj)).toISOString().slice(0,10) : null,
    latestLeaveDate: lastLeaveDate(history),
    leavesUsedThisMonth: leavesUsed,
    currentStatus: onLeaveNow ? "On Leave" : "Present",
    leaveHistory: history.map(formatLeave),
  });
}

export async function getEmployeeRemarks(req, res) {
  const employeeId = String(req.params.id ?? "").trim();
  if (!employeeId) return res.status(400).json({ message: "Employee ID is required" });

  const employee = await Employee.findOne({ employeeId }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const remarks = await EmployeeRemark.find({ employeeId }).sort({ date: -1, createdAt: -1 }).lean();
  res.json(remarks.map(formatRemark));
}

export async function createEmployeeRemark(req, res) {
  const employeeId = String(req.params.id ?? "").trim();
  const remarkType = String(req.body?.remarkType ?? "").trim();
  const title = String(req.body?.title ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const date = String(req.body?.date ?? "").trim();
  const addedBy = String(req.body?.addedBy ?? "Traffic Inspector").trim() || "Traffic Inspector";

  if (!employeeId) return res.status(400).json({ message: "Employee ID is required" });
  if (!remarkTypes.includes(remarkType)) return res.status(400).json({ message: "Invalid remark type" });
  if (!title) return res.status(400).json({ message: "Remark title is required" });
  if (!description) return res.status(400).json({ message: "Remark description is required" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "Valid remark date is required" });

  const employee = await Employee.findOne({ employeeId }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const remark = await EmployeeRemark.create({
    employeeId,
    remarkType,
    title,
    description,
    date,
    addedBy,
  });

  res.status(201).json(formatRemark(remark.toObject()));
}

export async function createEmployee(req, res) {
  const payload = {
    employeeId: req.body.employeeId ?? req.body.id,
    name: req.body.name,
    phone: req.body.phone,
    designation: req.body.designation,
    stationName: "",
    dob: req.body.dob ? new Date(req.body.dob) : undefined,
    doa: req.body.doa ? new Date(req.body.doa) : undefined,
    doj: req.body.doj ? new Date(req.body.doj) : undefined,
  };

  const station = await Station.findById(req.body.stationId).lean();
  if (!station) return res.status(400).json({ message: "Station not found" });
  payload.stationName = station.stationName;
  if (payload.designation === "P.WOMAN") payload.designation = "P/WOMAN";

  const employee = await Employee.create(payload);
  await syncStationTotal(req.body.stationId);
  res.status(201).json(formatEmployee(await Employee.findById(employee._id).lean()));
}

export async function updateEmployeeDesignation(req, res) {
  const employeeId = String(req.params.id ?? "").trim();
  const designation = normalizeDesignation(req.body?.designation);

  if (!employeeId) return res.status(400).json({ message: "Employee ID is required" });
  if (!designation) return res.status(400).json({ message: "Designation is required" });

  const existing = await Employee.findOne({ employeeId }).lean();
  if (!existing) return res.status(404).json({ message: "Employee not found" });

  const updated = await Employee.findOneAndUpdate(
    { employeeId },
    { designation },
    { new: true },
  ).lean();

  if (existing.designation !== designation) {
    await DesignationHistory.create({
      employeeId,
      oldDesignation: existing.designation,
      newDesignation: designation,
      changedAt: new Date(),
    });
  }

  res.json(formatEmployee(updated));
}

export async function updateEmployeeDetails(req, res) {
  const currentEmployeeId = String(req.params.employeeId ?? "").trim();
  if (!currentEmployeeId) return res.status(400).json({ message: "Employee ID is required" });

  const existing = await Employee.findOne({ employeeId: currentEmployeeId }).lean();
  if (!existing) return res.status(404).json({ message: "Employee not found" });

  const nextEmployeeId = String(req.body?.employeeId ?? currentEmployeeId).trim();
  const name = String(req.body?.name ?? existing.name ?? "").trim();
  const phone = String(req.body?.phone ?? existing.phone ?? "").trim();
  const designation = normalizeDesignation(req.body?.designation ?? existing.designation);

  if (!nextEmployeeId) return res.status(400).json({ message: "Employee ID is required" });
  if (!name) return res.status(400).json({ message: "Name is required" });
  if (!designation) return res.status(400).json({ message: "Designation is required" });

  if (nextEmployeeId !== currentEmployeeId) {
    const duplicate = await Employee.findOne({ employeeId: nextEmployeeId }).lean();
    if (duplicate) return res.status(409).json({ message: "Employee ID already exists" });
  }

  let stationName = String(req.body?.stationName ?? existing.stationName ?? "").trim();
  let stationForSync = null;
  if (req.body?.stationId) {
    stationForSync = await Station.findById(req.body.stationId).lean();
    if (!stationForSync) return res.status(400).json({ message: "Station not found" });
    stationName = stationForSync.stationName;
  } else if (stationName) {
    stationForSync = await Station.findOne({ stationName }).lean();
    if (!stationForSync) return res.status(400).json({ message: "Station not found" });
  }
  if (!stationName) return res.status(400).json({ message: "Station is required" });

  const payload = {
    employeeId: nextEmployeeId,
    name,
    phone,
    designation,
    stationName,
    dob: parseOptionalDate(req.body?.dob),
    doa: parseOptionalDate(req.body?.doa),
    doj: parseOptionalDate(req.body?.doj),
  };

  const updated = await Employee.findOneAndUpdate(
    { employeeId: currentEmployeeId },
    { $set: payload },
    { new: true, runValidators: true },
  ).lean();

  if (currentEmployeeId !== nextEmployeeId) {
    await Promise.all([
      LeaveRequest.updateMany({ employeeId: currentEmployeeId }, { $set: { employeeId: nextEmployeeId } }),
      DesignationHistory.updateMany({ employeeId: currentEmployeeId }, { $set: { employeeId: nextEmployeeId } }),
    ]);
  }

  if (existing.designation !== designation) {
    await DesignationHistory.create({
      employeeId: nextEmployeeId,
      oldDesignation: existing.designation,
      newDesignation: designation,
      changedAt: new Date(),
    });
  }

  const stationsToSync = new Set([existing.stationName, stationName].filter(Boolean));
  await Promise.all(
    [...stationsToSync].map(async (nameToSync) => {
      const station = await Station.findOne({ stationName: nameToSync }).select("_id").lean();
      if (station) await syncStationTotal(station._id);
    }),
  );

  res.json(formatEmployee(updated));
}

export async function syncStationTotal(stationId) {
  // Use employeeStats service to count only valid employees for the station
  const { getEmployeesCountForStation } = await import("../services/employeeStatsService.js");
  const station = await Station.findById(stationId).select("stationName").lean();
  const totalEmployees = station ? await getEmployeesCountForStation(station.stationName) : 0;
  await Station.findByIdAndUpdate(stationId, { totalEmployees });
}

function formatEmployee(employee) {
  return {
    id: employee.employeeId,
    employeeId: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    designation: employee.designation,
    stationName: employee.stationName,
    dob: employee.dob ? (new Date(employee.dob)).toISOString().slice(0,10) : null,
    doa: employee.doa ? (new Date(employee.doa)).toISOString().slice(0,10) : null,
    doj: employee.doj ? (new Date(employee.doj)).toISOString().slice(0,10) : null,
  };
}

function formatLeave(leave) {
  return {
    id: String(leave._id),
    employeeId: leave.employeeId,
    fromDate: leave.fromDate,
    toDate: leave.toDate,
    days: leave.days,
    reason: leave.reason,
    reasonType: leave.reasonType ?? null,
    customReason: leave.customReason ?? null,
    status: leave.status,
    source: leave.source ?? "Manual",
    createdAt: leave.createdAt,
  };
}

function formatRemark(remark) {
  return {
    id: String(remark._id),
    employeeId: remark.employeeId,
    remarkType: remark.remarkType,
    title: remark.title,
    description: remark.description,
    date: remark.date,
    addedBy: remark.addedBy,
    createdAt: remark.createdAt,
  };
}

function normalizeDesignation(value) {
  const compact = String(value ?? "").trim().replace(/\s+/g, " ");
  const key = compact.toUpperCase().replace(/[./\s-]/g, "");
  const normalized = {
    DYSS: "DY SS",
    PMAN: "P/MAN",
    PWOMAN: "P/WOMAN",
    SMR: "SMR",
    SM: "SM",
    SS: "SS",
    APM: "APM",
    SMASTER: "S/MASTER",
    CTNC: "CTNC",
    SRCLERK: "SR.CLERK",
    SHGMASTER: "SHG-MASTER",
  };
  return normalized[key] ?? compact;
}

function parseOptionalDate(value) {
  if (value === undefined) return undefined;
  const date = String(value ?? "").trim();
  return date ? new Date(date) : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
