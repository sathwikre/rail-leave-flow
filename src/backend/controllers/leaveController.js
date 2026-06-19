import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { diffDays, lastLeaveDate, leavesUsedThisMonth, MONTHLY_LEAVE_LIMIT } from "./leaveMetrics.js";
import { getRecommendation } from "../services/leaveAnalysisService.js";

export async function getLeaves(req, res) {
  const status = normalizeStatus(req.query.status);
  const filter = status ? { status } : {};
  const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean();
  const employees = await Employee.find({
    employeeId: { $in: leaves.map((leave) => leave.employeeId) },
  }).lean();
  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));

  res.json(
    leaves.map((leave) => ({
      ...formatLeave(leave),
      employeeName: employeeById.get(leave.employeeId)?.name ?? leave.employeeId,
      designation: employeeById.get(leave.employeeId)?.designation,
    })),
  );
}

export async function getLeaveById(req, res) {
  const leave = await LeaveRequest.findById(req.params.id).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });
  const employee = await Employee.findOne({ employeeId: leave.employeeId }).lean();
  const formatted = formatLeave(leave);
  formatted.employeeName = employee?.name ?? leave.employeeId;
  formatted.designation = employee?.designation;
  res.json(formatted);
}

export async function createLeave(req, res) {
  const employee = await Employee.findOne({ employeeId: req.body.employeeId }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const days = diffDays(req.body.fromDate, req.body.toDate);
  const leave = await LeaveRequest.create({
    employeeId: req.body.employeeId,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    days,
    reason: req.body.reason,
    status: "Pending",
    source: "Manual",
  });

  // compute analysis snapshot and save to leave
  try {
    const analysis = await getRecommendation(req.body.employeeId, days);
    await LeaveRequest.findByIdAndUpdate(leave._id, {
      latestLeaveDate: analysis.latestLeaveDate,
      leavesUsedThisMonth: analysis.leavesUsedThisMonth,
      remainingLeaves: analysis.remainingLeaves,
      totalAfterApproval: analysis.totalAfterApproval,
      recommendation: analysis.recommendation,
    });
  } catch (err) {
    console.warn("Failed to compute leave analysis:", err);
  }

  res.status(201).json({
    ...formatLeave(leave.toObject()),
    employeeName: employee.name,
    designation: employee.designation,
  });
}

export async function approveLeave(req, res) {
  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status: "Approved" },
    { new: true },
  ).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });

  try {
    const analysis = await getApprovedLeaveAnalysis(leave.employeeId);
    const updatedLeave = await LeaveRequest.findByIdAndUpdate(leave._id, analysis, {
      new: true,
    }).lean();
    return res.json(formatLeave(updatedLeave));
  } catch (err) {
    console.warn("Failed to update analysis on approve:", err);
  }

  res.json(formatLeave(leave));
}

export async function rejectLeave(req, res) {
  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status: "Rejected" },
    { new: true },
  ).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });

  try {
    const analysis = await getRecommendation(leave.employeeId, leave.days);
    const updatedLeave = await LeaveRequest.findByIdAndUpdate(leave._id, {
      latestLeaveDate: analysis.latestLeaveDate,
      leavesUsedThisMonth: analysis.leavesUsedThisMonth,
      remainingLeaves: analysis.remainingLeaves,
      totalAfterApproval: analysis.totalAfterApproval,
      recommendation: analysis.recommendation,
    }, { new: true }).lean();
    return res.json(formatLeave(updatedLeave));
  } catch (err) {
    console.warn("Failed to update analysis on reject:", err);
  }

  res.json(formatLeave(leave));
}

async function getApprovedLeaveAnalysis(employeeId) {
  const [used, history] = await Promise.all([
    leavesUsedThisMonth(employeeId),
    LeaveRequest.find({ employeeId }).sort({ fromDate: -1 }).lean(),
  ]);

  return {
    latestLeaveDate: lastLeaveDate(history),
    leavesUsedThisMonth: used,
    remainingLeaves: MONTHLY_LEAVE_LIMIT - used,
    totalAfterApproval: used,
    recommendation: used > MONTHLY_LEAVE_LIMIT ? "REJECT" : "APPROVE",
  };
}

function normalizeStatus(status) {
  if (!status || status === "all") return null;
  const value = String(status).toLowerCase();
  if (value === "pending") return "Pending";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return null;
}

function formatLeave(leave) {
  return {
    id: String(leave._id),
    employeeId: leave.employeeId,
    fromDate: leave.fromDate,
    toDate: leave.toDate,
    days: leave.days,
    reason: leave.reason,
    status: leave.status,
    source: leave.source ?? "Manual",
    latestLeaveDate: leave.latestLeaveDate ?? null,
    leavesUsedThisMonth: leave.leavesUsedThisMonth ?? 0,
    remainingLeaves: typeof leave.remainingLeaves === "number" ? leave.remainingLeaves : null,
    totalAfterApproval: typeof leave.totalAfterApproval === "number" ? leave.totalAfterApproval : null,
    recommendation: leave.recommendation ?? null,
    createdAt: leave.createdAt,
  };
}
