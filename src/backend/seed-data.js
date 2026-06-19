import { Employee } from "./models/employeeModel.js";
import { LeaveRequest } from "./models/leaveRequestModel.js";
import { Station } from "./models/stationModel.js";

const stationNames = [
  "Station A",
  "Station B",
  "Station C",
  "Station D",
  "Station E",
  "Station F",
  "Station G",
  "Station H",
  "Station I",
  "Station J",
];

const designations = ["Station Master", "Technician", "Track Maintainer", "Signal Operator"];
const names = [
  "Rajesh Kumar",
  "Amit Singh",
  "Suresh Sharma",
  "Vikram Patel",
  "Anil Yadav",
  "Ravi Verma",
  "Manoj Reddy",
  "Deepak Nair",
  "Sanjay Iyer",
  "Pradeep Gupta",
  "Arjun Mishra",
  "Karthik Joshi",
  "Naveen Chauhan",
  "Rahul Pandey",
  "Vinod Das",
  "Mahesh Kumar",
  "Kiran Singh",
  "Sunil Sharma",
  "Ajay Patel",
  "Rohit Yadav",
];

export async function seedIfEmpty() {
  const stationCount = await Station.countDocuments();
  if (stationCount > 0) return;

  const stations = await Station.insertMany(
    stationNames.map((stationName, index) => ({
      stationName,
      stationMaster: names[index],
      totalEmployees: 0,
    })),
  );

  const employees = [];
  for (let index = 0; index < names.length; index += 1) {
    const station = stations[index % stations.length];
    employees.push({
      employeeId: `RW-${String(index + 1001).padStart(4, "0")}`,
      name: names[index],
      phone: `+91 98765 ${String(43000 + index).padStart(5, "0")}`,
      designation: designations[index % designations.length],
      stationId: station._id,
    });
  }

  await Employee.insertMany(employees);
  await Promise.all(
    stations.map((station) =>
      Station.findByIdAndUpdate(station._id, {
        totalEmployees: employees.filter(
          (employee) => String(employee.stationId) === String(station._id),
        ).length,
      }),
    ),
  );

  const today = todayDateString();
  await LeaveRequest.insertMany([
    {
      employeeId: "RW-1001",
      fromDate: today,
      toDate: today,
      days: 1,
      reason: "Personal work",
      status: "Approved",
    },
    {
      employeeId: "RW-1002",
      fromDate: today,
      toDate: addDays(today, 1),
      days: 2,
      reason: "Family function",
      status: "Pending",
    },
  ]);
}

function todayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
