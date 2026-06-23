import { railwayEmployees, employeeDocument } from "./data/mantapampalleEmployees.js";
import { Employee } from "./models/employeeModel.js";
import { Station } from "./models/stationModel.js";

const stationNames = [
  "MANTAPAMPALLE", "ONTIMITTA", "BHAKARAPETA", "KANAMALOPALLE", "KADAPA",
  "KRISHNAPURAM", "GANGAYAPALLE", "KAMALAPURAM", "YERRAGUDIPADU",
  "YERRAGUNTLA", "KALAMALLA", "MUDDANUR",
  "TI/HX",
];

const authoritativeRosterStations = [
  "MANTAPAMPALLE",
  "ONTIMITTA",
  "BHAKARAPETA",
  "KANAMALOPALLE",
  "GANGAYAPALLE",
  "YERRAGUDIPADU",
  "YERRAGUNTLA",
  "KALAMALLA",
  "MUDDANUR",
];

export async function seedIfEmpty() {
  for (const stationName of stationNames) {
    await Station.updateOne(
      { stationName },
      { $setOnInsert: { stationName, stationMaster: "Station Master", totalEmployees: 0 } },
      { upsert: true },
    );
  }

  // The supplied station list is authoritative. Remove retired stations and
  // duplicate station documents so dashboard and frontend counts stay exact.
  await Station.deleteMany({ stationName: { $nin: stationNames } });
  const stationDocuments = await Station.find({ stationName: { $in: stationNames } })
    .sort({ _id: 1 })
    .select("_id stationName")
    .lean();
  const seenStationNames = new Set();
  const duplicateStationIds = [];
  for (const station of stationDocuments) {
    if (seenStationNames.has(station.stationName)) duplicateStationIds.push(station._id);
    else seenStationNames.add(station.stationName);
  }
  if (duplicateStationIds.length) {
    await Station.deleteMany({ _id: { $in: duplicateStationIds } });
  }

  const employeeById = new Map();
  for (const record of railwayEmployees) {
    const employee = employeeDocument(record);
    if (!employeeById.has(employee.employeeId)) employeeById.set(employee.employeeId, employee);
  }

  // Keep the supplied real roster available after a fresh deployment; never seed dummy employees.
  for (const employee of employeeById.values()) {
    await Employee.updateOne(
      { employeeId: employee.employeeId },
      { $set: employee, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  }

  // Reviewed rosters are authoritative: remove stale or manually duplicated
  // records so the station API and frontend show exactly the supplied employees.
  for (const stationName of authoritativeRosterStations) {
    const employeeIds = railwayEmployees
      .filter((record) => record.stationName === stationName)
      .map((record) => employeeDocument(record).employeeId);
    await Employee.deleteMany({
      stationName,
      employeeId: { $nin: employeeIds },
    });
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
