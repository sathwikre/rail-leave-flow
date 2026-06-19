import { Employee } from "./models/employeeModel.js";
import { LeaveRequest } from "./models/leaveRequestModel.js";
import { Station } from "./models/stationModel.js";

const stationsData = [
  { name: "Station A", master: "Rajesh Kumar" },
  { name: "Station B", master: "Amit Singh" },
  { name: "Station C", master: "Suresh Sharma" },
  { name: "Station D", master: "Vikram Patel" },
  { name: "Station E", master: "Anil Yadav" },
  { name: "Station F", master: "Ravi Verma" },
  { name: "Station G", master: "Manoj Reddy" },
  { name: "Station H", master: "Deepak Nair" },
  { name: "Station I", master: "Sanjay Iyer" },
  { name: "Station J", master: "Pradeep Gupta" },
];

const sampleEmployees = {
  "Station A": [
    ["RW101", "Ramesh", "Station Master"],
    ["RW102", "Suresh", "Technician"],
    ["RW103", "Kumar", "Track Maintainer"],
    ["RW104", "Ravi", "Signal Operator"],
    ["RW105", "Mahesh", "Technician"],
  ],
  "Station B": [
    ["RW201", "Arun", "Station Master"],
    ["RW202", "Kiran", "Technician"],
    ["RW203", "Naveen", "Signal Operator"],
    ["RW204", "Vinod", "Track Maintainer"],
    ["RW205", "Prakash", "Technician"],
  ],
  "Station C": [
    ["RW301", "Suresh", "Station Master"],
    ["RW302", "Rahul", "Technician"],
    ["RW303", "Anand", "Track Maintainer"],
    ["RW304", "Kamal", "Signal Operator"],
    ["RW305", "Rohit", "Technician"],
  ],
  "Station D": [
    ["RW401", "Vikram", "Station Master"],
    ["RW402", "Mohit", "Technician"],
    ["RW403", "Sanjay", "Track Maintainer"],
    ["RW404", "Anoop", "Signal Operator"],
    ["RW405", "Deepak", "Technician"],
  ],
  "Station E": [
    ["RW501", "Anil", "Station Master"],
    ["RW502", "Manish", "Technician"],
    ["RW503", "Kumar", "Track Maintainer"],
    ["RW504", "Ramesh", "Signal Operator"],
    ["RW505", "Sunil", "Technician"],
  ],
  "Station F": [
    ["RW601", "Ravi", "Station Master"],
    ["RW602", "Akhil", "Technician"],
    ["RW603", "Praveen", "Track Maintainer"],
    ["RW604", "Nitin", "Signal Operator"],
    ["RW605", "Manoj", "Technician"],
  ],
  "Station G": [
    ["RW701", "Manoj", "Station Master"],
    ["RW702", "Ramesh", "Technician"],
    ["RW703", "Kiran", "Track Maintainer"],
    ["RW704", "Ravi", "Signal Operator"],
    ["RW705", "Suresh", "Technician"],
  ],
  "Station H": [
    ["RW801", "Deepak", "Station Master"],
    ["RW802", "Amit", "Technician"],
    ["RW803", "Prakash", "Track Maintainer"],
    ["RW804", "Naveen", "Signal Operator"],
    ["RW805", "Rohit", "Technician"],
  ],
  "Station I": [
    ["RW901", "Sanjay", "Station Master"],
    ["RW902", "Kumar", "Technician"],
    ["RW903", "Vinod", "Track Maintainer"],
    ["RW904", "Ajay", "Signal Operator"],
    ["RW905", "Pradeep", "Technician"],
  ],
  "Station J": [
    ["RW1001", "Pradeep", "Station Master"],
    ["RW1002", "Mahesh", "Technician"],
    ["RW1003", "Karan", "Track Maintainer"],
    ["RW1004", "Rohit", "Signal Operator"],
    ["RW1005", "Anuj", "Technician"],
  ],
};

export async function seedIfEmpty() {
  // Remove any broken 'id' unique index on employees that can block upserts
  try {
    const indexes = await Employee.collection.indexes();
    const bad = indexes.find((ix) => ix.key && ix.key.id === 1);
    if (bad) {
      try {
        await Employee.collection.dropIndex(bad.name || "id_1");
        console.log("Dropped problematic employee index:", bad.name || "id_1");
      } catch (e) {
        console.warn("Failed to drop bad employee index:", e.message || e);
      }
    }
  } catch (e) {
    console.warn("Could not inspect employee indexes:", e.message || e);
  }

  // Ensure all stations exist (create missing)
  for (const s of stationsData) {
    const existing = await Station.findOne({ stationName: s.name }).lean();
    if (!existing) {
      await Station.create({ stationName: s.name, stationMaster: s.master, totalEmployees: 0 });
    }
  }

  // reload stations
  const stations = await Station.find().lean();
  const stationMap = new Map(stations.map((s) => [s.stationName, s._id]));

  // Ensure each sample employee exists for its station
  for (const [stationName, list] of Object.entries(sampleEmployees)) {
    const sid = stationMap.get(stationName);
    if (!sid) continue;
    for (const [employeeId, name, designation] of list) {
      if (!employeeId) continue;
      // upsert by employeeId to avoid duplicate-key errors
      await Employee.findOneAndUpdate(
        { employeeId },
        {
          $setOnInsert: {
            employeeId,
            name,
            designation,
            phone: randomPhone(),
            stationId: sid,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  // recompute station totals
  await Promise.all(
    stations.map((station) =>
      Employee.countDocuments({ stationId: station._id }).then((count) =>
        Station.findByIdAndUpdate(station._id, { totalEmployees: count }),
      ),
    ),
  );

  // create leave requests if there are fewer than 20
  const leaveCount = await LeaveRequest.countDocuments();
  if (leaveCount < 20) {
    const leaves = [
      ["RW703", "2026-06-14", "2026-06-14", 1, "Medical", "Approved"],
      ["RW804", "2026-06-10", "2026-06-11", 2, "Personal", "Approved"],
    ];

    const leaveDocs = leaves.map(([employeeId, fromDate, toDate, days, reason, status]) => ({
      employeeId,
      fromDate,
      toDate,
      days,
      reason,
      status,
      // Seed sample leave requests as coming from email
      source: "Email",
    }));

    await LeaveRequest.insertMany(leaveDocs);

    // One-time cleanup: remove any existing manual leave requests so UI shows only email requests
    try {
      await LeaveRequest.deleteMany({ source: "Manual" });
      console.log("Removed legacy Manual leave requests during seed cleanup");
    } catch (e) {
      console.warn("Failed to delete Manual leave requests during seed cleanup:", e.message || e);
    }
  }
}

function randomPhone() {
  const n = Math.floor(Math.random() * 9000000) + 1000000;
  return `+91 9${String(n).slice(0, 2)} ${String(n).slice(2)}`;

}
