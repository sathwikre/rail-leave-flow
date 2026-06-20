import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import {
  diffDays,
  lastLeaveDate,
  leavesUsedThisMonth,
  MONTHLY_LEAVE_LIMIT,
  getLeavesUsedThisMonth,
  getLatestLeave,
} from "./leaveMetrics.js";
import { getRecommendation } from "../services/leaveAnalysisService.js";

export async function getLeaves(req, res) {
  const status = normalizeStatus(req.query.status);
  // Return all leave requests (both Email and Manual). Allow optional status filter.
  const filter = {};
  if (status) filter.status = status;
  const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean();

  // Debug: log how many leaves were fetched and a sample of sources
  try {
    console.log(`getLeaves: fetched ${leaves.length} leave(s). sources=`, [...new Set(leaves.map((l) => l.source))]);
  } catch (e) {
    // ignore logging errors
  }
  const employees = await Employee.find({
    employeeId: { $in: leaves.map((leave) => leave.employeeId) },
  }).lean();
  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));

  res.json(
    leaves.map((leave) => ({
      ...formatLeave(leave),
      employeeName: employeeById.get(leave.employeeId)?.name ?? leave.employeeId,
      designation: employeeById.get(leave.employeeId)?.designation,
      stationName: employeeById.get(leave.employeeId)?.stationName,
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
  formatted.stationName = employee?.stationName;
  res.json(formatted);
}

export async function getLeaveAnalysis(req, res) {
  const leave = await LeaveRequest.findById(req.params.id).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });

  try {
    const latestLeaveDate = await getLatestLeave(leave.employeeId, leave._id);
    const currentLeaves = await getLeavesUsedThisMonth(leave.employeeId);
    const requestedDays = Number(leave.days) || 0;
    const totalAfterApproval = currentLeaves + requestedDays;

    return res.json({
      latestLeaveDate,
      currentLeaves,
      requestedDays,
      totalAfterApproval,
      exceededLimit: totalAfterApproval > MONTHLY_LEAVE_LIMIT,
    });
  } catch (err) {
    console.warn("Failed to compute leave analysis:", err);
    return res.status(500).json({ message: "Failed to compute leave analysis" });
  }
}

export async function prospectiveAnalysis(req, res) {
  const { employeeId, fromDate, toDate, days } = req.body || {};
  if (!employeeId) return res.status(400).json({ message: "employeeId is required" });
  try {
    const requestedDays = Number(days ?? (fromDate && toDate ? diffDays(fromDate, toDate) : 0)) || 0;
    const analysis = await getRecommendation(employeeId, requestedDays);
    return res.json({
      latestLeaveDate: analysis.latestLeaveDate,
      currentLeaves: analysis.leavesUsedThisMonth,
      requestedDays: requestedDays,
      totalAfterApproval: analysis.totalAfterApproval,
      exceededLimit: analysis.totalAfterApproval > MONTHLY_LEAVE_LIMIT,
    });
  } catch (err) {
    console.warn("Failed to compute prospective analysis:", err);
    return res.status(500).json({ message: "Failed to compute leave analysis" });
  }
}

export async function createLeave(req, res) {
  const employee = await Employee.findOne({ employeeId: req.body.employeeId }).lean();
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const days = diffDays(req.body.fromDate, req.body.toDate);
  const reasonType = req.body.reasonType ?? req.body.reason ?? "Other";
  const customReason = req.body.customReason ?? null;
  const reasonToStore = reasonType === "Others" ? (customReason || "Others") : reasonType;
  const leave = await LeaveRequest.create({
    employeeId: req.body.employeeId,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    days,
    reason: reasonToStore,
    reasonType,
    customReason,
    status: "Pending",
    source: "Manual",
  });

  // Debug: log saved manual leave
  try {
    console.log("Manual request saved", { id: String(leave._id), employeeId: leave.employeeId, source: leave.source });
  } catch (e) {
    // ignore
  }

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
    stationName: employee.stationName,
  });
}

export async function approveLeave(req, res) {
  const force = String(req.query.force ?? "").toLowerCase() === "true";

  const leave = await LeaveRequest.findById(req.params.id).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });

  try {
    // Calculate current approved leaves for this employee this month
    const currentLeaves = await getLeavesUsedThisMonth(leave.employeeId);
    const requestedDays = Number(leave.days) || 0;
    const totalAfterApproval = currentLeaves + requestedDays;

    // debug logs to aid verification
    console.log("approveLeave: currentLeaves=", currentLeaves);
    console.log("approveLeave: requestedDays=", requestedDays);
    console.log("approveLeave: totalAfterApproval=", totalAfterApproval);

    if (totalAfterApproval > MONTHLY_LEAVE_LIMIT && !force) {
      // Return a warning payload to the client — do not auto-reject or change DB
      return res.json({
        warning: true,
        currentLeaves,
        requestedDays,
        totalAfterApproval,
      });
    }

    // Proceed with approval (force or within limit)
    const applied = await LeaveRequest.findByIdAndUpdate(
      leave._id,
      { status: "Approved" },
      { new: true },
    ).lean();

    const analysis = await getApprovedLeaveAnalysis(leave.employeeId);
    const updatedLeave = await LeaveRequest.findByIdAndUpdate(applied._id, analysis, {
      new: true,
    }).lean();
    return res.json(formatLeave(updatedLeave));
  } catch (err) {
    console.warn("Failed to update analysis on approve:", err);
    return res.status(500).json({ message: "Failed to approve leave" });
  }
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
    reasonType: leave.reasonType ?? null,
    customReason: leave.customReason ?? null,
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
