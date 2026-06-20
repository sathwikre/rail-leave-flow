import dotenv from "dotenv";
import mongoose from "mongoose";
import XLSX from "xlsx";
import { normalizeDesignation } from "../data/mantapampalleEmployees.js";
import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";

dotenv.config();

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

const workbook = XLSX.readFile("rail.xlsx", { cellDates: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
const records = [];
const skipped = [];
let stationName = "";

for (let index = 0; index < rows.length; index += 1) {
  const [serial, pfNumber, name, designation, dob, doa, doj] = rows[index];
  const isStationHeading = typeof serial === "string" && serial.trim() && !pfNumber && !name && !designation;
  if (isStationHeading) {
    stationName = serial.trim().toUpperCase();
    continue;
  }
  if (!name || !designation) continue;

  const employeeId = String(pfNumber ?? "").trim().replace(/[\s']/g, "").toUpperCase();
  if (!employeeId) {
    skipped.push({ row: index + 1, name: String(name).trim(), reason: "missing employeeId" });
    continue;
  }

  records.push({
    row: index + 1,
    employeeId,
    name: String(name).trim().replace(/\s+/g, " "),
    designation: normalizeDesignation(designation),
    stationName,
    dob: parseDate(dob),
    doa: parseDate(doa),
    doj: parseDate(doj),
    phone: "",
  });
}

const byEmployeeId = new Map();
const conflicts = [];
for (const record of records) {
  const previous = byEmployeeId.get(record.employeeId);
  if (previous && (previous.name !== record.name || previous.stationName !== record.stationName)) {
    conflicts.push({
      employeeId: record.employeeId,
      previous: `${previous.name} (${previous.stationName})`,
      applied: `${record.name} (${record.stationName})`,
    });
  }
  byEmployeeId.set(record.employeeId, record);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const leaveRequestsBefore = await LeaveRequest.countDocuments();

  for (const record of byEmployeeId.values()) {
    const { row: _row, ...employee } = record;
    await Station.updateOne(
      { stationName: employee.stationName },
      { $setOnInsert: { stationName: employee.stationName, stationMaster: "Station Master", totalEmployees: 0 } },
      { upsert: true },
    );
    await Employee.updateOne(
      { employeeId: employee.employeeId },
      { $set: employee, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, runValidators: true },
    );
  }

  const totals = await Employee.aggregate([{ $group: { _id: "$stationName", count: { $sum: 1 } } }]);
  const counts = new Map(totals.map((item) => [item._id, item.count]));
  const stations = await Station.find().select("stationName").lean();
  await Promise.all(stations.map((station) =>
    Station.updateOne({ _id: station._id }, { $set: { totalEmployees: counts.get(station.stationName) ?? 0 } }),
  ));

  const [employees, uniqueEmployeeIds, leaveRequestsAfter] = await Promise.all([
    Employee.countDocuments(), Employee.distinct("employeeId"), LeaveRequest.countDocuments(),
  ]);
  console.log(JSON.stringify({
    workbookRows: records.length,
    appliedUniqueRows: byEmployeeId.size,
    employees,
    uniqueEmployeeIds: uniqueEmployeeIds.length,
    skipped,
    conflicts,
    leaveRequestsBefore,
    leaveRequestsAfter,
  }));
} finally {
  await mongoose.disconnect();
}

function parseDate(value) {
  if (!value) return undefined;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)) : undefined;
  }

  const parts = String(value).trim().split(/\D+/).filter(Boolean);
  if (parts.length !== 3) return undefined;
  let [day, month, year] = parts.map(Number);
  if (year < 100) year += year <= 29 ? 2000 : 1900;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return undefined;
  return date;
}
