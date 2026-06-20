#!/usr/bin/env node
import mongoose from 'mongoose';

function printUsage() {
  console.log(`Usage: node delete-stations-and-employees.mjs --stations "A,B,C" [--dry-run] [--with-leaverequests]

Options:
  --stations         Comma-separated list of station names to delete (required)
  --dry-run          Show counts and what would be deleted, do not perform deletes
  --with-leaverequests Also delete LeaveRequest docs related to deleted employees
`);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { stations: [], dryRun: false, withLeaveRequests: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stations') {
      const val = argv[i+1];
      if (!val) throw new Error('--stations requires a value');
      out.stations = val.split(',').map(s => s.trim()).filter(Boolean);
      i++;
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--with-leaverequests') {
      out.withLeaveRequests = true;
    } else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    } else {
      // allow bare comma-separated list
      out.stations = out.stations.concat(a.split(',').map(s=>s.trim()).filter(Boolean));
    }
  }
  return out;
}

async function main() {
  const { stations, dryRun, withLeaveRequests } = parseArgs();
  if (!stations || stations.length === 0) {
    printUsage();
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI environment variable must be set.');
    console.error('Example:\n  MONGODB_URI="mongodb://localhost:27017/mydb" node delete-stations-and-employees.mjs --stations "A,B" --dry-run');
    process.exit(2);
  }

  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const conn = mongoose.connection;
  try {
    const Stations = conn.collection('stations');
    const Employees = conn.collection('employees');
    const LeaveRequests = conn.collection('leaverequests');

    console.log('Stations to delete:', stations);

    const employeesToDelete = await Employees.find({ stationName: { $in: stations } }).toArray();
    const employeeIds = employeesToDelete.map(e => e.employeeId || e._id);

    const stationCount = await Stations.countDocuments({ name: { $in: stations } });
    const employeeCount = employeesToDelete.length;
    let leaveCount = 0;
    if (withLeaveRequests) {
      leaveCount = await LeaveRequests.countDocuments({ $or: [ { employeeId: { $in: employeeIds } }, { employee: { $in: employeeIds } }, { stationName: { $in: stations } } ] });
    }

    console.log(`Found ${stationCount} station(s), ${employeeCount} employee(s)${withLeaveRequests ? `, ${leaveCount} leave request(s)` : ''}.`);

    if (dryRun) {
      console.log('Dry-run mode - no documents will be deleted.');
      await mongoose.disconnect();
      return;
    }

    // Confirm with user
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('Proceed with deletion? (yes/no) ', resolve));
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted by user. No changes made.');
      await mongoose.disconnect();
      return;
    }

    const delEmployeesRes = await Employees.deleteMany({ stationName: { $in: stations } });
    console.log(`Deleted ${delEmployeesRes.deletedCount || 0} employee(s).`);

    const delStationsRes = await Stations.deleteMany({ name: { $in: stations } });
    console.log(`Deleted ${delStationsRes.deletedCount || 0} station(s).`);

    if (withLeaveRequests) {
      const delLeavesRes = await LeaveRequests.deleteMany({ $or: [ { employeeId: { $in: employeeIds } }, { employee: { $in: employeeIds } }, { stationName: { $in: stations } } ] });
      console.log(`Deleted ${delLeavesRes.deletedCount || 0} leave request(s).`);
    }

  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
