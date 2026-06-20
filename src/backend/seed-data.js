import { railwayEmployees, employeeDocument } from "./data/mantapampalleEmployees.js";
import { Employee } from "./models/employeeModel.js";
import { Station } from "./models/stationModel.js";

const stationNames = [
  "MANTAPAMPALLE", "ONTIMITTA", "BHAKARAPETA", "KANAMALOPALLE", "KADAPA",
  "KRISHNAPURAM", "GANGAYAPALLE", "KAMALAPURAM", "YERRAGUDIPADU",
  "YERRAGUNTLA", "NANDALUR", "KALAMALLA", "MUDDANUR",
];

export async function seedIfEmpty() {
  for (const stationName of stationNames) {
    await Station.updateOne(
      { stationName },
      { $setOnInsert: { stationName, stationMaster: "Station Master", totalEmployees: 0 } },
      { upsert: true },
    );
  }

  // Keep the supplied real roster available after a fresh deployment; never seed dummy employees.
  for (const record of railwayEmployees) {
    const employee = employeeDocument(record);
    await Employee.updateOne(
      { employeeId: employee.employeeId },
      { $set: employee, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  }

  const totals = await Employee.aggregate([
    { $group: { _id: "$stationName", count: { $sum: 1 } } },
  ]);
  const counts = new Map(totals.map((item) => [item._id, item.count]));
  const stations = await Station.find().select("stationName").lean();
  await Promise.all(stations.map((station) =>
    Station.updateOne({ _id: station._id }, { $set: { totalEmployees: counts.get(station.stationName) ?? 0 } }),
  ));
}
