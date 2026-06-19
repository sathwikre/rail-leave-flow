import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";
import {
  lastLeaveDate,
  leavesUsedThisMonth,
  MONTHLY_LEAVE_LIMIT,
  todayDateString,
} from "./leaveMetrics.js";

export async function getStationReport(_req, res) {
  const [stations, employees] = await Promise.all([
    Station.find().sort({ stationName: 1 }).lean(),
    Employee.find({
      employeeId: { $exists: true, $ne: "" },
      stationId: { $exists: true, $ne: null },
      designation: { $exists: true, $ne: "" },
    }).lean(),
  ]);
  const today = todayDateString();

  const rows = await Promise.all(
    stations.map(async (station) => {
      const stationEmployees = employees.filter(
        (employee) => String(employee.stationId) === String(station._id),
      );
      const employeeIds = stationEmployees.map((employee) => employee.employeeId);
      const onLeaveIds = employeeIds.length
        ? await LeaveRequest.distinct("employeeId", {
            employeeId: { $in: employeeIds },
            status: "Approved",
            fromDate: { $lte: today },
            toDate: { $gte: today },
          })
        : [];
      const usage = await Promise.all(
        stationEmployees.map((employee) => leavesUsedThisMonth(employee.employeeId)),
      );

      return {
        stationName: station.stationName,
        totalEmployees: stationEmployees.length,
        employeesOnLeave: onLeaveIds.length,
        employeesExceedingMonthlyLeaveLimit: usage.filter(
          (used) => used > MONTHLY_LEAVE_LIMIT,
        ).length,
      };
    }),
  );

  res.json(rows);
}

export async function getEmployeeReport(_req, res) {
  const employees = await Employee.find({
    employeeId: { $exists: true, $ne: "" },
    stationId: { $exists: true, $ne: null },
    designation: { $exists: true, $ne: "" },
  }).sort({ employeeId: 1 }).lean();
  const rows = await Promise.all(
    employees.map(async (employee) => {
      const [leavesUsed, history] = await Promise.all([
        leavesUsedThisMonth(employee.employeeId),
        LeaveRequest.find({ employeeId: employee.employeeId }).sort({ fromDate: -1 }).lean(),
      ]);

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        leavesUsedThisMonth: leavesUsed,
        lastLeaveDate: lastLeaveDate(history),
        remainingLeaveBalance: MONTHLY_LEAVE_LIMIT - leavesUsed,
      };
    }),
  );

  res.json(rows);
}
