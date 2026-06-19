import { LeaveRequest } from "../models/leaveRequestModel.js";

export const MONTHLY_LEAVE_LIMIT = 4;

export function todayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diffDays(fromDate, toDate) {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (to < from) {
    const error = new Error("toDate must be on or after fromDate");
    error.status = 400;
    throw error;
  }
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function currentMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const start = formatDate(new Date(year, month, 1));
  const end = formatDate(new Date(year, month + 1, 0));
  return { start, end };
}

export async function leavesUsedThisMonth(employeeId) {
  const { start, end } = currentMonthRange();
  const leaves = await LeaveRequest.find({
    employeeId,
    status: "Approved",
    fromDate: { $lte: end },
    toDate: { $gte: start },
  }).lean();

  return leaves.reduce((total, leave) => total + overlapDays(leave.fromDate, leave.toDate, start, end), 0);
}

// Return total approved leave days for the employee starting this month (simple sum)
export async function getLeavesUsedThisMonth(employeeId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = formatDate(startOfMonth);

  const leaves = await LeaveRequest.find({
    employeeId,
    status: "Approved",
    fromDate: { $gte: start },
  }).lean();

  return leaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);
}

export async function getLatestLeave(employeeId, excludeId = null) {
  const query = { employeeId, status: "Approved" };
  if (excludeId) query._id = { $ne: excludeId };
  const latest = await LeaveRequest.findOne(query).sort({ toDate: -1 }).lean();
  return latest ? latest.toDate : null;
}

export function lastLeaveDate(leaves) {
  const approved = leaves
    .filter((leave) => leave.status === "Approved")
    .sort((a, b) => String(b.toDate).localeCompare(String(a.toDate)));
  return approved[0]?.toDate ?? null;
}

function overlapDays(fromDate, toDate, rangeStart, rangeEnd) {
  const start = maxDate(parseDate(fromDate), parseDate(rangeStart));
  const end = minDate(parseDate(toDate), parseDate(rangeEnd));
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function maxDate(a, b) {
  return a > b ? a : b;
}

function minDate(a, b) {
  return a < b ? a : b;
}
