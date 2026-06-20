import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";
import { todayDateString } from "./leaveMetrics.js";
import * as employeeStats from "../services/employeeStatsService.js";

export async function getStations(_req, res) {
  const stations = await Station.find().sort({ stationName: 1 }).lean();
  const data = await Promise.all(stations.map((station) => stationSummary(station)));
  res.json(data);
}

export async function getStationById(req, res) {
  console.log("getStationById called with id:", req.params.id);
  const station = await Station.findById(req.params.id).lean();
  if (!station) return res.status(404).json({ message: "Station not found" });

  const [summary, employees] = await Promise.all([
    stationSummary(station),
    Employee.find({
      stationName: station.stationName,
      employeeId: { $exists: true, $ne: "" },
      name: { $exists: true, $ne: "" },
      designation: { $exists: true, $ne: "" },
    }).sort({ employeeId: 1 }).lean(),
  ]);
  console.log(`Found ${employees.length} employees for station ${req.params.id}`);

  res.json({
    ...summary,
    employees: employees.map(formatEmployee),
  });
}

async function stationSummary(station) {
  const employeesCount = await employeeStats.getEmployeesCountForStation(station.stationName);
  const onLeaveCount = await employeeStats.getEmployeesOnLeaveForStation(station.stationName);

  return {
    id: String(station._id),
    stationName: station.stationName,
    stationMaster: station.stationMaster,
    totalEmployees: employeesCount,
    employeesOnLeave: onLeaveCount,
  };
}

function formatEmployee(employee) {
  return {
    id: employee.employeeId,
    employeeId: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    designation: employee.designation,
    stationName: employee.stationName,
  };
}
