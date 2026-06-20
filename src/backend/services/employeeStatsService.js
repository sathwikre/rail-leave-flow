import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { todayDateString } from "../controllers/leaveMetrics.js";
import { Station } from "../models/stationModel.js";

function validEmployeeFilter() {
  return {
    employeeId: { $exists: true, $ne: "" },
    name: { $exists: true, $ne: "" },
    designation: { $exists: true, $ne: "" },
    stationId: { $exists: true, $ne: null },
    phone: { $exists: true, $ne: "" },
  };
}

export async function getTotalEmployees() {
  const filter = validEmployeeFilter();
  return Employee.countDocuments(filter);
}

export async function getEmployeesCountForStation(stationId) {
  const filter = { ...validEmployeeFilter(), stationId };
  return Employee.countDocuments(filter);
}

export async function getEmployeesOnLeaveForStation(stationId) {
  const filter = { ...validEmployeeFilter(), stationId };
  const employees = await Employee.find(filter).select("employeeId").lean();
  const ids = employees.map((e) => e.employeeId);
  if (!ids.length) return 0;
  const today = todayDateString();
  const onLeave = await LeaveRequest.distinct("employeeId", {
    employeeId: { $in: ids },
    status: "Approved",
    fromDate: { $lte: today },
    toDate: { $gte: today },
  });
  return onLeave.length;
}

export async function getEmployeesOnLeaveToday() {
  const filter = validEmployeeFilter();
  const employees = await Employee.find(filter).select("employeeId").lean();
  const ids = employees.map((e) => e.employeeId);
  if (!ids.length) return 0;
  const today = todayDateString();
  const onLeave = await LeaveRequest.distinct("employeeId", {
    employeeId: { $in: ids },
    status: "Approved",
    fromDate: { $lte: today },
    toDate: { $gte: today },
  });
  return onLeave.length;
}

export async function getEmployeesOnLeaveTodayDetails() {
  const filter = validEmployeeFilter();
  const employees = await Employee.find(filter).select("employeeId name designation stationId").lean();
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));
  const ids = employees.map((e) => e.employeeId);
  if (!ids.length) return [];
  const today = todayDateString();

  const leaves = await LeaveRequest.find({
    employeeId: { $in: ids },
    status: "Approved",
    fromDate: { $lte: today },
    toDate: { $gte: today },
  })
    .sort({ fromDate: 1 })
    .lean();

  if (!leaves.length) return [];

  // Fetch station names for employees referenced
  const stationIds = Array.from(new Set(employees.map((e) => String(e.stationId))));
  const stations = await Station.find({ _id: { $in: stationIds } }).select("stationName").lean();
  const stationMap = new Map(stations.map((s) => [String(s._id), s.stationName]));

  const result = leaves.map((leave) => {
    const emp = empMap.get(leave.employeeId) || {};
    const stationName = emp.stationId ? stationMap.get(String(emp.stationId)) || "" : "";
    return {
      employeeId: leave.employeeId,
      employeeName: emp.name || "",
      stationName,
      designation: emp.designation || "",
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      days: leave.days,
    };
  });

  return result;
}

// Generalized: get employees on leave for a specific date (YYYY-MM-DD)
export async function getEmployeesOnLeave(date) {
  const filter = validEmployeeFilter();
  const employees = await Employee.find(filter).select("employeeId").lean();
  const ids = employees.map((e) => e.employeeId);
  if (!ids.length) return 0;
  const target = date || todayDateString();
  const onLeave = await LeaveRequest.distinct("employeeId", {
    employeeId: { $in: ids },
    status: "Approved",
    fromDate: { $lte: target },
    toDate: { $gte: target },
  });
  return onLeave.length;
}

export async function getEmployeesOnLeaveDetails(date) {
  const filter = validEmployeeFilter();
  const employees = await Employee.find(filter).select("employeeId name designation stationId").lean();
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));
  const ids = employees.map((e) => e.employeeId);
  if (!ids.length) return [];
  const target = date || todayDateString();

  const leaves = await LeaveRequest.find({
    employeeId: { $in: ids },
    status: "Approved",
    fromDate: { $lte: target },
    toDate: { $gte: target },
  })
    .sort({ fromDate: 1 })
    .lean();

  if (!leaves.length) return [];

  const stationIds = Array.from(new Set(employees.map((e) => String(e.stationId))));
  const stations = await Station.find({ _id: { $in: stationIds } }).select("stationName").lean();
  const stationMap = new Map(stations.map((s) => [String(s._id), s.stationName]));

  const result = leaves.map((leave) => {
    const emp = empMap.get(leave.employeeId) || {};
    const stationName = emp.stationId ? stationMap.get(String(emp.stationId)) || "" : "";
    return {
      employeeId: leave.employeeId,
      employeeName: emp.name || "",
      stationName,
      designation: emp.designation || "",
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      days: leave.days,
    };
  });

  return result;
}

// Sick leaves count/list for a date
export async function getSickLeavesCount(date) {
  const target = date || todayDateString();
  const leaves = await LeaveRequest.distinct("employeeId", {
    status: "Approved",
    reasonType: "Sick Leave",
    fromDate: { $lte: target },
    toDate: { $gte: target },
  });
  return leaves.length;
}

export async function getSickLeavesList(date) {
  const target = date || todayDateString();
  const leaves = await LeaveRequest.find({
    status: "Approved",
    reasonType: "Sick Leave",
    fromDate: { $lte: target },
    toDate: { $gte: target },
  })
    .sort({ fromDate: 1 })
    .lean();

  if (!leaves.length) return [];

  const employeeIds = Array.from(new Set(leaves.map((l) => l.employeeId)));
  const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select("employeeId name designation stationId").lean();
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));

  const stationIds = Array.from(new Set(employees.map((e) => String(e.stationId))));
  const stations = await Station.find({ _id: { $in: stationIds } }).select("stationName").lean();
  const stationMap = new Map(stations.map((s) => [String(s._id), s.stationName]));

  return leaves.map((leave) => {
    const emp = empMap.get(leave.employeeId) || {};
    const stationName = emp.stationId ? stationMap.get(String(emp.stationId)) || "" : "";
    return {
      employeeId: leave.employeeId,
      employeeName: emp.name || "",
      stationName,
      designation: emp.designation || "",
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      days: leave.days,
      reason: leave.reason,
    };
  });
}
