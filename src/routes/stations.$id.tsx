import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, UserCheck, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/stations/$id")({
  head: () => ({ meta: [{ title: "Station - Railway LMS" }] }),
  component: StationDetailPage,
});

type StationEmployee = {
  id?: string;
  employeeId: string;
  name: string;
  designation: string;
  phone: string;
  stationId?: string;
};

type Station = {
  id: string;
  stationName: string;
  stationMaster: string;
  totalEmployees: number;
  employeesOnLeave: number;
};

function StationDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [employees, setEmployees] = useState<StationEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadStation() {
      try {
        const [stationResponse, employeeResponse] = await Promise.all([
          fetch(apiUrl(`/api/stations/${id}`), { cache: "no-store" }),
          fetch(apiUrl(`/api/employees/station/${id}`), { cache: "no-store" }),
        ]);

        if (!stationResponse.ok) {
          console.warn("Station fetch returned non-ok status", stationResponse.status);
          if (!ignore) {
            setStation(null);
            setEmployees([]);
          }
          return;
        }

        const data = await stationResponse.json();
        console.log("Station fetched:", data);

        let stationEmployees: StationEmployee[] = [];
        if (employeeResponse.ok) {
          stationEmployees = await employeeResponse.json();
        } else {
          console.warn("Employees fetch returned non-ok status", employeeResponse.status);
        }
        console.log("Employees fetched:", stationEmployees);

        if (!ignore) {
          setStation(data);
          setEmployees(stationEmployees);
        }
      } catch (error) {
        console.warn("Unable to load station.", error);
        if (!ignore) {
          setStation(null);
          setEmployees([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStation();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Station">
        <p className="text-sm text-muted-foreground">Loading station...</p>
      </AppLayout>
    );
  }

  if (!station) {
    return (
      <AppLayout title="Station">
        <Link
          to="/stations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to stations
        </Link>
        <p className="text-sm text-muted-foreground">Station not found.</p>
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
          {employees.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No employees found for this station</div>
          ) : (
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
                {employees.map((employee) => (
                  <tr
                    key={employee.employeeId}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      console.log("Selected employee:", employee.employeeId);
                      navigate({ to: "/employees/$id", params: { id: employee.employeeId } });
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs">{employee.employeeId}</td>
                    <td className="px-5 py-3 font-semibold">{employee.name}</td>
                    <td className="px-5 py-3">{employee.designation}</td>
                    <td className="px-5 py-3">{employee.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
