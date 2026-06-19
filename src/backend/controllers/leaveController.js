import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { diffDays } from "./leaveMetrics.js";

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
  });

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
  res.json(formatLeave(leave));
}

export async function rejectLeave(req, res) {
  const leave = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status: "Rejected" },
    { new: true },
  ).lean();
  if (!leave) return res.status(404).json({ message: "Leave request not found" });
  res.json(formatLeave(leave));
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
    createdAt: leave.createdAt,
  };
}
