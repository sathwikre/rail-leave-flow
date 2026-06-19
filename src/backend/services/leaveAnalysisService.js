import { LeaveRequest } from "../models/leaveRequestModel.js";
import { leavesUsedThisMonth, lastLeaveDate, MONTHLY_LEAVE_LIMIT } from "../controllers/leaveMetrics.js";

export async function getLatestLeave(employeeId) {
  const leave = await LeaveRequest.findOne({ employeeId, status: "Approved" }).sort({ toDate: -1 }).lean();
  return leave ? leave.toDate : null;
}

export async function getLeavesUsedThisMonth(employeeId) {
  return await leavesUsedThisMonth(employeeId);
}

export async function getRemainingLeaves(employeeId) {
  const used = await getLeavesUsedThisMonth(employeeId);
  return MONTHLY_LEAVE_LIMIT - used;
}

export async function getRecommendation(employeeId, requestedDays) {
  const used = await getLeavesUsedThisMonth(employeeId);
  const totalAfter = used + Number(requestedDays || 0);
  const recommendation = totalAfter > MONTHLY_LEAVE_LIMIT ? "REJECT" : "APPROVE";
  return {
    leavesUsedThisMonth: used,
    totalAfterApproval: totalAfter,
    remainingLeaves: Math.max(MONTHLY_LEAVE_LIMIT - used, 0),
    recommendation,
    latestLeaveDate: await getLatestLeave(employeeId),
  };
}
