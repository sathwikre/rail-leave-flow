export type LeaveStatus = "pending" | "approved" | "rejected";

export interface Employee {
  id: string;
  name: string;
  phone: string;
  department: string;
  joiningDate: string;
  leaveUsedThisMonth: number;
  avatar?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  requestDate: string;
  status: LeaveStatus;
}

export interface LeaveHistoryEntry {
  date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
}

export const MONTHLY_LIMIT = 4;

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

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function seededRandom(seed: number) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const rng = seededRandom(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

function pad(n: number, l = 2) { return String(n).padStart(l, "0"); }

export const employees: Employee[] = Array.from({ length: 36 }, (_, i) => {
  const fn = pick(firstNames);
  const ln = pick(lastNames);
  const joinYear = 2010 + Math.floor(rng() * 14);
  return {
    id: `RW-${pad(1001 + i, 4)}`,
    name: `${fn} ${ln}`,
    phone: `+91 ${pad(70000 + Math.floor(rng() * 29999), 5)} ${pad(Math.floor(rng() * 99999), 5)}`,
    department: pick(departments),
    joiningDate: `${joinYear}-${pad(1 + Math.floor(rng() * 12))}-${pad(1 + Math.floor(rng() * 28))}`,
    leaveUsedThisMonth: Math.floor(rng() * 5),
  };
});

const today = new Date();
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export const leaveRequests: LeaveRequest[] = Array.from({ length: 22 }, (_, i) => {
  const emp = employees[Math.floor(rng() * employees.length)];
  const offset = Math.floor(rng() * 30) - 10;
  const from = addDays(today, offset);
  const days = 1 + Math.floor(rng() * 4);
  const to = addDays(from, days - 1);
  const r = rng();
  const status: LeaveStatus = r < 0.4 ? "pending" : r < 0.75 ? "approved" : "rejected";
  return {
    id: `LR-${pad(2001 + i, 4)}`,
    employeeId: emp.id,
    employeeName: emp.name,
    fromDate: dateStr(from),
    toDate: dateStr(to),
    days,
    reason: pick(reasons),
    requestDate: dateStr(addDays(from, -2 - Math.floor(rng() * 3))),
    status,
  };
});

export function getEmployee(id: string) { return employees.find(e => e.id === id); }
export function getRequest(id: string) { return leaveRequests.find(r => r.id === id); }

export function leaveHistoryFor(employeeId: string): LeaveHistoryEntry[] {
  const r2 = seededRandom(employeeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const n = 4 + Math.floor(r2() * 6);
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, -Math.floor(r2() * 180) - i * 10);
    const status: LeaveStatus = r2() < 0.7 ? "approved" : r2() < 0.5 ? "pending" : "rejected";
    return { date: dateStr(d), days: 1 + Math.floor(r2() * 3), reason: pick(reasons), status };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export const monthlyStats = [
  { month: "Jan", approved: 28, rejected: 6, pending: 0 },
  { month: "Feb", approved: 31, rejected: 4, pending: 0 },
  { month: "Mar", approved: 26, rejected: 8, pending: 0 },
  { month: "Apr", approved: 34, rejected: 5, pending: 0 },
  { month: "May", approved: 40, rejected: 9, pending: 0 },
  { month: "Jun", approved: 29, rejected: 7, pending: 2 },
  { month: "Jul", approved: 33, rejected: 6, pending: 4 },
  { month: "Aug", approved: 38, rejected: 5, pending: 3 },
  { month: "Sep", approved: 27, rejected: 8, pending: 5 },
  { month: "Oct", approved: 31, rejected: 6, pending: 4 },
  { month: "Nov", approved: 35, rejected: 7, pending: 6 },
  { month: "Dec", approved: 24, rejected: 4, pending: 9 },
];

export const departmentStats = departments.map(d => ({
  department: d,
  leaves: 10 + Math.floor(rng() * 40),
}));

export const topLeaveTakers = employees
  .slice()
  .sort((a, b) => b.leaveUsedThisMonth - a.leaveUsedThisMonth)
  .slice(0, 6)
  .map(e => ({ name: e.name, leaves: e.leaveUsedThisMonth + Math.floor(rng() * 8) }));

export function getDashboardStats() {
  const total = employees.length;
  const onLeave = leaveRequests.filter(r => {
    if (r.status !== "approved") return false;
    const t = dateStr(today);
    return r.fromDate <= t && r.toDate >= t;
  }).length;
  return {
    totalWorkers: total,
    presentToday: total - onLeave - 2,
    onLeaveToday: onLeave,
    pendingRequests: leaveRequests.filter(r => r.status === "pending").length,
    approvedThisMonth: leaveRequests.filter(r => r.status === "approved").length,
    rejectedThisMonth: leaveRequests.filter(r => r.status === "rejected").length,
  };
}

export function recommendationFor(employeeId: string, requestedDays: number) {
  const emp = getEmployee(employeeId);
  if (!emp) return { decision: "REJECT" as const, reason: "Employee not found" };
  const remaining = MONTHLY_LIMIT - emp.leaveUsedThisMonth;
  if (requestedDays <= remaining) {
    return { decision: "APPROVE" as const, reason: `Within monthly limit. ${remaining} day(s) remaining before this request.` };
  }
  return { decision: "REJECT" as const, reason: `Exceeds monthly limit of ${MONTHLY_LIMIT} days. Only ${remaining} day(s) remaining.` };
}
