import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { employees, MONTHLY_LIMIT, Employee } from "@/lib/mockData";
import { Search, Phone, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Railway LMS" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newLeaveUsed, setNewLeaveUsed] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState<Record<string, AttendanceStatus>>({});
  const depts = Array.from(
    new Set((localEmployees.length ? localEmployees : employees).map((e) => e.department)),
  );
  const filtered = localEmployees.filter(
    (e) =>
      (dept === "all" || e.department === dept) &&
      (!q ||
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.id.toLowerCase().includes(q.toLowerCase())),
  );

  useEffect(() => {
    let ignore = false;

    async function loadEmployees() {
      try {
        const res = await fetch(apiUrl("/api/employees"));
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data)) {
          setLocalEmployees(data as Employee[]);
        }
      } catch (error) {
        console.warn("Unable to load employees from API; using local demo data.", error);
      }
    }

    loadEmployees();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadTodayAttendance() {
      try {
        const res = await fetch(apiUrl(`/api/attendance?date=${todayIso()}`));
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data)) {
          setTodayAttendance(
            Object.fromEntries(
              data.map((record: AttendanceRecord) => [record.employeeId, record.status]),
            ),
          );
        }
      } catch (error) {
        console.warn("Unable to load today's attendance from API.", error);
      }
    }

    loadTodayAttendance();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    function onUpdated(e: any) {
      try {
        const detail = e?.detail;
        if (!detail) return;

        const saved = detail.attendance ?? detail;
        const updatedEmployee = detail.employee;

        if (saved && saved.date === todayIso()) {
          setTodayAttendance((current) => ({ ...current, [saved.employeeId]: saved.status }));
        }

        if (updatedEmployee) {
          setLocalEmployees((current) => {
            const idx = current.findIndex((c) => c.id === updatedEmployee.id);
            if (idx === -1) return current;
            const next = [...current];
            next[idx] = { ...next[idx], ...updatedEmployee };
            return next;
          });
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("attendance:updated", onUpdated as EventListener);
    return () => window.removeEventListener("attendance:updated", onUpdated as EventListener);
  }, []);

  return (
    <AppLayout
      title="Employees"
      subtitle={`${localEmployees.length} railway workers across ${depts.length} departments`}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or employee ID..."
            className="pl-9"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depts.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add Employee"}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Employee ID"
              value={newEmployeeId}
              onChange={(e) => setNewEmployeeId(e.target.value)}
            />
            <Input
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Select value={newDept} onValueChange={setNewDept}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Leave used this month"
              value={String(newLeaveUsed)}
              onChange={(e) => setNewLeaveUsed(Number(e.target.value || 0))}
            />
          </div>
          <div className="mt-3">
            <Button
              onClick={async () => {
                if (!newName.trim()) return;
                const joiningDate = new Date().toISOString().slice(0, 10);
                const payload = {
                  ...(newEmployeeId.trim() ? { id: newEmployeeId.trim() } : {}),
                  name: newName.trim(),
                  phone: newPhone.trim(),
                  department: newDept || depts[0] || "General",
                  joiningDate,
                  leaveUsedThisMonth: Number(newLeaveUsed || 0),
                };
                try {
                  const res = await fetch(apiUrl("/api/employees"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    const err = await res.text();
                    toast.error(`Failed to create employee: ${err}`);
                    return;
                  }
                  const created = await res.json();
                  setLocalEmployees((prev) => [created as Employee, ...prev]);
                  employees.unshift(created as Employee);
                  toast.success(`Created ${created.id}`);
                  setNewEmployeeId("");
                  setNewName("");
                  setNewPhone("");
                  setNewDept("");
                  setNewLeaveUsed(0);
                  setShowForm(false);
                } catch (e) {
                  console.error(e);
                  toast.error("Network error while creating employee");
                }
              }}
            >
              Create employee
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((emp) => {
          const remaining = MONTHLY_LIMIT - emp.leaveUsedThisMonth;
          const status = todayAttendance[emp.id] ?? "present";
          return (
            <Link
              key={emp.id}
              to="/employees/$id"
              params={{ id: emp.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {emp.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {emp.name}
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">{emp.id}</p>
                </div>
                <AttendanceBadge status={status} />
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{emp.phone}</span>
                </div>
              </div>
              {/* Leave used and balance removed per request */}
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}

type AttendanceStatus = "present" | "leave" | "absent" | "off";

type AttendanceRecord = {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
};

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const className =
    status === "absent"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : status === "leave"
        ? "bg-warning/15 text-warning-foreground border-warning/30"
        : status === "off"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-success/15 text-success border-success/30";

  return (
    <Badge variant="outline" className={`shrink-0 capitalize ${className}`}>
      {status}
    </Badge>
  );
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
