import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports - Railway LMS" }] }),
  component: ReportsPage,
});

type StationReport = {
  stationName: string;
  totalEmployees: number;
  employeesOnLeave: number;
  employeesExceedingMonthlyLeaveLimit: number;
};

type EmployeeReport = {
  employeeId: string;
  name: string;
  leavesUsedThisMonth: number;
  lastLeaveDate: string | null;
  remainingLeaveBalance: number;
};

function ReportsPage() {
  const [stationRows, setStationRows] = useState<StationReport[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeReport[]>([]);

  useEffect(() => {
    async function loadReports() {
      const [stationRes, employeeRes] = await Promise.all([
        fetch(apiUrl("/api/reports/station"), { cache: "no-store" }),
        fetch(apiUrl("/api/reports/employee"), { cache: "no-store" }),
      ]);
      if (stationRes.ok) setStationRows(await stationRes.json());
      if (employeeRes.ok) setEmployeeRows(await employeeRes.json());
    }

    loadReports();
    // Refresh reports when a leave is approved elsewhere
    function onApproved() {
      loadReports();
    }
    window.addEventListener("leave:approved", onApproved as EventListener);
    return () => window.removeEventListener("leave:approved", onApproved as EventListener);
  }, []);

  return (
    <AppLayout title="Reports" subtitle="Station-wise and employee-wise leave balance">
      <ReportTable title="Station-wise Report">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-5 py-3 font-medium">Station Name</th>
            <th className="text-left px-5 py-3 font-medium">Total Employees</th>
            <th className="text-left px-5 py-3 font-medium">Employees on Leave</th>
            <th className="text-left px-5 py-3 font-medium">Exceeding Limit</th>
          </tr>
        </thead>
        <tbody>
          {stationRows.map((row) => (
            <tr key={row.stationName} className="border-t border-border hover:bg-muted/30">
              <td className="px-5 py-3 font-semibold">{row.stationName}</td>
              <td className="px-5 py-3">{row.totalEmployees}</td>
              <td className="px-5 py-3">{row.employeesOnLeave}</td>
              <td className={`px-5 py-3 ${row.employeesExceedingMonthlyLeaveLimit > 0 ? "text-destructive font-semibold" : ""}`}>
                {row.employeesExceedingMonthlyLeaveLimit}
              </td>
            </tr>
          ))}
        </tbody>
      </ReportTable>

      <div className="mt-6">
        <ReportTable title="Employee-wise Report">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Employee ID</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Used This Month</th>
              <th className="text-left px-5 py-3 font-medium">Last Leave Date</th>
              <th className="text-left px-5 py-3 font-medium">Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            {employeeRows.map((row) => (
              <tr key={row.employeeId} className="border-t border-border hover:bg-muted/30">
                <td className="px-5 py-3 font-mono text-xs">{row.employeeId}</td>
                <td className="px-5 py-3 font-semibold">{row.name}</td>
                <td className="px-5 py-3">{row.leavesUsedThisMonth}</td>
                <td className="px-5 py-3">{row.lastLeaveDate ?? "-"}</td>
                <td className="px-5 py-3">{row.remainingLeaveBalance}</td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      </div>
    </AppLayout>
  );
}

function ReportTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
