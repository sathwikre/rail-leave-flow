import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Employee, employees } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronLeft, ChevronRight, Moon, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance - Railway LMS" }] }),
  component: AttendancePage,
});

type Status = "present" | "leave" | "off";

type AttendanceRecord = {
  employeeId: string;
  date: string;
  status: Status;
  note?: string;
};

function AttendancePage() {
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);
  const [empId, setEmpId] = useState(employees[0].id);
  const [date, setDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const year = date.getFullYear();
  const month = date.getMonth();

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return localEmployees;

    return localEmployees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.id.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query),
    );
  }, [localEmployees, searchQuery]);

  const emp =
    localEmployees.find((e) => e.id === empId) ?? filteredEmployees[0] ?? localEmployees[0];

  useEffect(() => {
    let ignore = false;

    async function loadEmployees() {
      try {
        const res = await fetch(apiUrl("/api/employees"));
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data) && data.length) {
          setLocalEmployees(data as Employee[]);
          if (!data.some((employee: Employee) => employee.id === empId)) {
            setEmpId((data[0] as Employee).id);
          }
        }
      } catch (error) {
        console.warn("Unable to load employees from API; using local demo data.", error);
      }
    }

    loadEmployees();
    return () => {
      ignore = true;
    };
  }, [empId]);

  useEffect(() => {
    if (!searchQuery.trim() || filteredEmployees.length === 0) return;
    if (filteredEmployees.some((employee) => employee.id === empId)) return;
    setEmpId(filteredEmployees[0].id);
  }, [empId, filteredEmployees, searchQuery]);

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      try {
        const params = new URLSearchParams({
          employeeId: empId,
          year: String(year),
          month: String(month + 1),
        });
        const res = await fetch(apiUrl(`/api/attendance?${params.toString()}`));
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data)) {
          setAttendance(
            Object.fromEntries(data.map((record: AttendanceRecord) => [record.date, record])),
          );
        }
      } catch (error) {
        console.warn("Unable to load attendance from API.", error);
        if (!ignore) setAttendance({});
      }
    }

    loadAttendance();
    return () => {
      ignore = true;
    };
  }, [empId, month, year]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null; iso?: string; status?: Status }[] = [];

    for (let i = 0; i < startDay; i++) cells.push({ date: null });

    for (let d = 1; d <= total; d++) {
      const dt = new Date(year, month, d);
      const iso = formatDate(dt);
      const raw = attendance[iso]?.status as string | undefined;
      // treat legacy 'absent' records as 'leave' so UI shows only leave
      const savedStatus = raw === "absent" ? ("leave" as Status) : (raw as Status | undefined);

      cells.push({ date: dt, iso, status: savedStatus ?? "present" });
    }

    return cells;
  }, [attendance, month, year]);

  async function updateAttendance(day: string, status: Status) {
    if (!emp) return;

    const previous = attendance[day];
    const next = { employeeId: emp.id, date: day, status };
    setAttendance((current) => ({ ...current, [day]: next }));

    try {
      const res = await fetch(apiUrl("/api/attendance"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!res.ok) {
        setAttendance((current) => restoreAttendance(current, day, previous));
        toast.error(`Failed to update attendance: ${await res.text()}`);
        return;
      }

      const body = await res.json();
      // server returns { attendance, employee } when possible
      const saved = body?.attendance ?? body;
      const updatedEmployee = body?.employee;

      setAttendance((current) => ({ ...current, [day]: saved as AttendanceRecord }));
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("attendance:updated", { detail: { attendance: saved, employee: updatedEmployee } }),
          );
        }
      } catch (e) {
        /* ignore */
      }
      toast.success(`Marked ${status} for ${day}`);
    } catch (error) {
      console.error(error);
      setAttendance((current) => restoreAttendance(current, day, previous));
      toast.error("Network error while updating attendance");
    }
  }

  const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });
  const counts = days.reduce(
    (acc, c) => {
      if (c.status) acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (!emp) {
    return (
      <AppLayout
        title="Attendance"
        subtitle="Calendar view of daily worker attendance"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search employee name, ID, department..."
      >
        <p className="text-sm text-muted-foreground">No employees available.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Attendance"
      subtitle="Calendar view of daily worker attendance"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search employee name, ID, department..."
    >
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <Select value={empId} onValueChange={setEmpId}>
          <SelectTrigger className="w-full lg:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filteredEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} ({e.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 lg:ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 rounded-lg bg-card border border-border min-w-[180px] text-center font-semibold">
            {monthName}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Legend
          label="Present"
          count={counts.present || 0}
          className="bg-success/15 text-success border-success/30"
        />
        <Legend
          label="Leave"
          count={counts.leave || 0}
          className="bg-warning/15 text-warning-foreground border-warning/30"
        />
        <Legend
          label="Off"
          count={counts.off || 0}
          className="bg-muted text-muted-foreground border-border"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Showing for <span className="font-semibold text-foreground">{emp.name}</span> -{" "}
          {emp.department}
        </p>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
          {days.map((c, i) => (
            <div
              key={i}
              className={cn(
                  "aspect-square min-h-16 rounded-lg border flex flex-col items-center justify-center gap-1 text-sm transition-colors",
                  !c.date && "border-transparent",
                  c.status === "present" && "bg-success/10 border-success/30 text-success",
                  c.status === "leave" && "bg-warning/10 border-warning/30 text-warning-foreground",
                  c.status === "off" && "bg-muted border-border text-muted-foreground",
                )}
            >
              {c.date && c.iso && (
                <>
                  <span className="font-semibold">{c.date.getDate()}</span>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant={c.status === "present" ? "default" : "outline"}
                      className="h-6 w-6"
                      title="Mark present"
                      onClick={() => updateAttendance(c.iso!, "present")}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={c.status === "leave" ? "default" : "outline"}
                      className="h-6 w-6"
                      title="Mark leave"
                      onClick={() => updateAttendance(c.iso!, "leave")}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={c.status === "off" ? "default" : "outline"}
                      className="h-6 w-6"
                      title="Mark off"
                      onClick={() => updateAttendance(c.iso!, "off")}
                    >
                      <Moon className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Legend({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 flex items-center justify-between", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="font-display text-xl font-bold">{count}</span>
    </div>
  );
}

function restoreAttendance(
  current: Record<string, AttendanceRecord>,
  day: string,
  previous?: AttendanceRecord,
) {
  if (previous) return { ...current, [day]: previous };
  const { [day]: _removed, ...rest } = current;
  return rest;
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
