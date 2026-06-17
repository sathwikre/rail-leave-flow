const departments = ["Track Maintenance", "Signal & Telecom", "Locomotive", "Station Ops", "Electrical", "Mechanical"];
const firstNames = ["Rajesh", "Amit", "Suresh", "Vikram", "Anil", "Ravi", "Manoj", "Deepak", "Sanjay", "Pradeep", "Arjun", "Karthik", "Naveen", "Rahul", "Vinod", "Mahesh", "Kiran", "Sunil", "Ajay", "Rohit"];
const lastNames = ["Kumar", "Singh", "Sharma", "Patel", "Yadav", "Verma", "Reddy", "Nair", "Iyer", "Gupta", "Mishra", "Joshi", "Chauhan", "Pandey", "Das"];
const reasons = [
  "Family function at home town",
  "Medical appointment",
  "Sister's wedding",
  "Personal work",
  "Child's school admission",
  "Health issue - fever",
  "Festival celebration",
  "Father unwell",
  "Religious ceremony",
  "Property matters",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rng = seededRandom(42);
const pick = (items) => items[Math.floor(rng() * items.length)];
const pad = (n, l = 2) => String(n).padStart(l, "0");
const dateStr = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function buildSeedData() {
  const now = new Date();

  const employees = Array.from({ length: 36 }, (_, i) => {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const joinYear = 2010 + Math.floor(rng() * 14);

    return {
      id: `RW-${pad(1001 + i, 4)}`,
      name: `${firstName} ${lastName}`,
      phone: `+91 ${pad(70000 + Math.floor(rng() * 29999), 5)} ${pad(Math.floor(rng() * 99999), 5)}`,
      department: pick(departments),
      joiningDate: `${joinYear}-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`,
      leaveUsedThisMonth: Math.floor(rng() * 5),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
  });

  const leaveRequests = Array.from({ length: 22 }, (_, i) => {
    const employee = employees[Math.floor(rng() * employees.length)];
    const offset = Math.floor(rng() * 30) - 10;
    const from = addDays(now, offset);
    const days = 1 + Math.floor(rng() * 4);
    const to = addDays(from, days - 1);
    const statusRoll = rng();
    const status = statusRoll < 0.4 ? "pending" : statusRoll < 0.75 ? "approved" : "rejected";

    return {
      id: `LR-${pad(2001 + i, 4)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      fromDate: dateStr(from),
      toDate: dateStr(to),
      days,
      reason: pick(reasons),
      requestDate: dateStr(addDays(from, -2 - Math.floor(rng() * 3))),
      status,
      createdAt: now,
      updatedAt: now,
    };
  });

  return { employees, leaveRequests };
}
