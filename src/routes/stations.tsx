import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";

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

function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    let ignore = false;

    async function loadStations() {
      try {
        const response = await fetch(apiUrl("/api/stations"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) setStations(data);
      } catch (error) {
        console.warn("Unable to load stations.", error);
      }
    }

    loadStations();
    return () => {
      ignore = true;
    };
  }, []);

  const totalEmployees = stations.reduce((sum, station) => sum + station.totalEmployees, 0);
  const onLeave = stations.reduce((sum, station) => sum + station.employeesOnLeave, 0);

  return (
    <AppLayout title="Stations" subtitle="10 stations managed from one leave desk">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Stations" value={stations.length} icon={Building2} tone="primary" />
        <StatCard label="Total Employees" value={totalEmployees} icon={Users} tone="success" />
        <StatCard label="On Leave Today" value={onLeave} icon={UserCheck} tone="warning" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {stations.map((station) => (
          <Link
            key={station.id}
            to="/stations/$id"
            params={{ id: station.id }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold truncate">{station.stationName}</h2>
                <p className="text-sm text-muted-foreground truncate">
                  Master: {station.stationMaster}
                </p>
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
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
