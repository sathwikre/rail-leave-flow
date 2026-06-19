import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";
import { todayDateString } from "./leaveMetrics.js";

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
      stationId: station._id,
      employeeId: { $exists: true, $ne: "" },
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
  const employees = await Employee.find({
    stationId: station._id,
    employeeId: { $exists: true, $ne: "" },
    designation: { $exists: true, $ne: "" },
  }).select("employeeId").lean();
  const employeeIds = employees.map((employee) => employee.employeeId);
  const today = todayDateString();
  const onLeave = employeeIds.length
    ? await LeaveRequest.distinct("employeeId", {
        employeeId: { $in: employeeIds },
        status: "Approved",
        fromDate: { $lte: today },
        toDate: { $gte: today },
      })
    : [];

  return {
    id: String(station._id),
    stationName: station.stationName,
    stationMaster: station.stationMaster,
    totalEmployees: employees.length,
    employeesOnLeave: onLeave.length,
  };
}

function formatEmployee(employee) {
  return {
    id: employee.employeeId,
    employeeId: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    designation: employee.designation,
    stationId: String(employee.stationId),
  };
}
