import dotenv from "dotenv";
import mongoose from "mongoose";
import { employeeDocument, railwayEmployees } from "../data/mantapampalleEmployees.js";
import { Employee } from "../models/employeeModel.js";
import { LeaveRequest } from "../models/leaveRequestModel.js";
import { Station } from "../models/stationModel.js";

dotenv.config();

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");

const records = [...new Map(railwayEmployees.map((record) => {
  const employee = employeeDocument(record);
  return [employee.employeeId, employee];
})).values()];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const leaveRequestsBefore = await LeaveRequest.countDocuments();

  await Employee.deleteMany({});

  for (const employee of records) {
    await Station.updateOne(
      { stationName: employee.stationName },
      { $setOnInsert: { stationName: employee.stationName, stationMaster: "", totalEmployees: 0 } },
      { upsert: true },
    );
    await Employee.updateOne(
      { employeeId: employee.employeeId },
      { $set: employee, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
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
  console.log(JSON.stringify({ employees, uniqueEmployeeIds: uniqueEmployeeIds.length, leaveRequestsBefore, leaveRequestsAfter }));
} finally {
  await mongoose.disconnect();
}
