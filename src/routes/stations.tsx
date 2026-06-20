import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
// StatCard removed per UX change: top summary cards deleted
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/stations")({
  head: () => ({ meta: [{ title: "Stations - Railway LMS" }] }),
  component: StationsPage,
});

type Station = {
  id: string;
  stationName: string;
  stationMaster: string;
  totalEmployees: number;
  employeesOnLeave: number;
};

type Employee = {
  id?: string;
  employeeId: string;
  name: string;
  designation: string;
  phone: string;
  stationId?: string;
};

function StationsPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadStations() {
      try {
        const response = await fetch(apiUrl("/api/stations"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) {
          setStations(data);
          const total = data.reduce((s: any, it: any) => s + (it.totalEmployees || 0), 0);
          console.log("Stations total employees:", total);
        }
      } catch (error) {
        console.warn("Unable to load stations.", error);
      }
    }

    loadStations();
    const onAppRefresh = () => loadStations();
    window.addEventListener("app:refresh", onAppRefresh as EventListener);
    return () => {
      ignore = true;
      window.removeEventListener("app:refresh", onAppRefresh as EventListener);
    };
  }, []);

  const totalEmployees = stations.reduce((sum, station) => sum + station.totalEmployees, 0);
  const onLeave = stations.reduce((sum, station) => sum + station.employeesOnLeave, 0);

  async function handleViewEmployees(stationId: string) {
    console.log("Selected station:", stationId);

    const station = stations.find((item) => item.id === stationId) ?? null;
    setSelectedStation(station);
    setEmployees([]);
    setEmployeeDialogOpen(true);
    setLoadingEmployees(true);

    try {
      const response = await fetch(apiUrl(`/api/employees/station/${stationId}`), {
        cache: "no-store",
      });
      const fetchedEmployees = response.ok ? await response.json() : [];
      console.log("Employees fetched:", fetchedEmployees);
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.warn("Unable to load employees for station.", error);
      console.log("Employees fetched:", []);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }

  return (
    <AppLayout title="Stations" subtitle="10 stations managed from one leave desk">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stations.map((station) => (
          <div
            key={station.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold truncate">{station.stationName}</h2>
                <p className="text-sm text-muted-foreground truncate">Master: {station.stationMaster}</p>
              </div>
              <Building2 className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">Employees</div>
                <div className="font-display text-xl font-bold">{station.totalEmployees}</div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-xs text-muted-foreground">On Leave</div>
                <div className="font-display text-xl font-bold">{station.employeesOnLeave}</div>
              </div>
            </div>
            <div className="mt-4">
              <Button size="sm" onClick={() => handleViewEmployees(station.id)}>
                View Employees
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedStation?.stationName ?? "Station Details"}</DialogTitle>
            <DialogDescription>
              Master: {selectedStation?.stationMaster ?? "-"} · Total Employees:{" "}
              {selectedStation?.totalEmployees ?? employees.length}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            {loadingEmployees ? (
              <div className="p-6 text-sm text-muted-foreground">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No employees found for this station
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Employee ID</th>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Designation</th>
                    <th className="text-left px-5 py-3 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.employeeId}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setEmployeeDialogOpen(false);
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
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
