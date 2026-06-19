import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/stations/$id")({
  head: () => ({ meta: [{ title: "Station - Railway LMS" }] }),
  component: StationDetailPage,
});

type StationEmployee = {
  employeeId: string;
  name: string;
  designation: string;
  phone: string;
};

type Station = {
  id: string;
  stationName: string;
  stationMaster: string;
  totalEmployees: number;
  employeesOnLeave: number;
  employees: StationEmployee[];
};

function StationDetailPage() {
  const { id } = Route.useParams();
  const [station, setStation] = useState<Station | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadStation() {
      try {
        const response = await fetch(apiUrl(`/api/stations/${id}`), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) setStation(data);
      } catch (error) {
        console.warn("Unable to load station.", error);
      }
    }

    loadStation();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (!station) {
    return (
      <AppLayout title="Station">
        <p className="text-sm text-muted-foreground">Loading station...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={station.stationName} subtitle={`Station Master: ${station.stationMaster}`}>
      <Link
        to="/stations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to stations
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Station Master" value={station.stationMaster} icon={UserRound} tone="primary" />
        <StatCard label="Total Employees" value={station.totalEmployees} icon={Users} tone="success" />
        <StatCard label="Currently On Leave" value={station.employeesOnLeave} icon={UserCheck} tone="warning" />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-lg font-bold">Employees</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Employee ID</th>
                <th className="text-left px-5 py-3 font-medium">Employee Name</th>
                <th className="text-left px-5 py-3 font-medium">Designation</th>
                <th className="text-left px-5 py-3 font-medium">Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {station.employees.map((employee) => (
                <tr key={employee.employeeId} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs">{employee.employeeId}</td>
                  <td className="px-5 py-3 font-semibold">{employee.name}</td>
                  <td className="px-5 py-3">{employee.designation}</td>
                  <td className="px-5 py-3">{employee.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
