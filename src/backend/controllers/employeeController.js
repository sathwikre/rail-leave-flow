import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";
import { lastLeaveDate, leavesUsedThisMonth, MONTHLY_LEAVE_LIMIT } from "./leaveMetrics.js";

export async function getEmployees(req, res) {
  const q = String(req.query.q ?? "").trim();
  const stationId = String(req.query.stationId ?? "").trim();
  const filter = {};

  if (stationId && stationId !== "all") filter.stationId = stationId;
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
    stationId: { $exists: true, $ne: null },
    designation: { $exists: true, $ne: "" },
    name: { $exists: true, $ne: "" },
    phone: { $exists: true, $ne: "" },
  };

  Object.assign(filter, required);

  const employees = await Employee.find(filter).populate("stationId").sort({ employeeId: 1 }).lean();
  res.json(employees.map(formatEmployee));
}

export async function getEmployeeById(req, res) {
  const employee = await Employee.findOne({ employeeId: req.params.id }).populate("stationId").lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  // Treat incomplete records as not found
  if (!employee.employeeId || !employee.stationId || !employee.designation) {
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
    stationId: req.params.stationId,
    employeeId: { $exists: true, $ne: "" },
    name: { $exists: true, $ne: "" },
    designation: { $exists: true, $ne: "" },
    phone: { $exists: true, $ne: "" },
  })
    .sort({ employeeId: 1 })
    .lean();
  console.log(`getEmployeesByStation found ${employees.length} employees`);
  res.json(employees.map(formatEmployee));
}

export async function getEmployeeLeaves(req, res) {
  const empId = req.params.id;
  const employee = await Employee.findOne({ employeeId: empId }).populate("stationId").lean();
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
    stationName: employee.stationId?.stationName ?? null,
    phone: employee.phone,
    latestLeaveDate: lastLeaveDate(history),
    leavesUsedThisMonth: leavesUsed,
    currentStatus: onLeaveNow ? "On Leave" : "Present",
    leaveHistory: history.map(formatLeave),
  });
}

export async function createEmployee(req, res) {
  const payload = {
    employeeId: req.body.employeeId ?? req.body.id,
    name: req.body.name,
    phone: req.body.phone,
    designation: req.body.designation,
    stationId: req.body.stationId,
  };

  const station = await Station.findById(payload.stationId).lean();
  if (!station) return res.status(400).json({ message: "Station not found" });

  const employee = await Employee.create(payload);
  await syncStationTotal(payload.stationId);
  res.status(201).json(formatEmployee(await Employee.findById(employee._id).populate("stationId").lean()));
}

export async function syncStationTotal(stationId) {
  // Use employeeStats service to count only valid employees for the station
  const { getEmployeesCountForStation } = await import("../services/employeeStatsService.js");
  const totalEmployees = await getEmployeesCountForStation(stationId);
  await Station.findByIdAndUpdate(stationId, { totalEmployees });
}

function formatEmployee(employee) {
  const station = employee.stationId && typeof employee.stationId === "object" ? employee.stationId : null;
  const stationId = station ? String(station._id) : String(employee.stationId);

  return {
    id: employee.employeeId,
    employeeId: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    designation: employee.designation,
    stationId,
    stationName: station?.stationName,
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
