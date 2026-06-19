import { diffDays } from "../controllers/leaveMetrics.js";

// Parse plain text email body with lines like "Employee ID: RW1023"
export function parseLeaveEmail(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const data = {};
  for (const line of lines) {
    const [keyPart, ...rest] = line.split(":");
    if (!keyPart) continue;
    const key = keyPart.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "employee id" || key === "employeeid") data.employeeId = value;
    if (key === "from date" || key === "fromdate") data.fromDate = value;
    if (key === "to date" || key === "todate") data.toDate = value;
    if (key === "reason") data.reason = value;
  }

  if (!data.employeeId || !data.fromDate || !data.toDate || !data.reason) return null;
  try {
    const days = diffDays(data.fromDate, data.toDate);
    return { ...data, days };
  } catch (err) {
    return null;
  }
}
