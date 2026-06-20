import { connectDatabase, closeDatabase } from "../db.js";
import { Employee } from "../models/employeeModel.js";

async function main() {
  try {
    await connectDatabase();
    console.log("Connected to database, running cleanup for invalid employees...");

    const res = await Employee.deleteMany({
      $or: [
        { employeeId: { $exists: false } },
        { employeeId: "" },
        { stationName: { $exists: false } },
        { stationName: "" },
        { designation: { $exists: false } },
        { designation: "" },
      ],
    });

    console.log(`Deleted ${res.deletedCount ?? 0} invalid employee(s)`);
  } catch (err) {
    console.error("Cleanup failed:", err);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

main();
