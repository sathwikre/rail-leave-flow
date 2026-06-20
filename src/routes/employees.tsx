import { createFileRoute } from "@tanstack/react-router";
import { Building2, Phone, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees - Railway LMS" }] }),
  component: EmployeesPage,
});

type Station = { id: string; stationName: string };
type Employee = {
  employeeId: string;
  id: string;
  name: string;
  phone: string;
  designation: string;
  stationId?: string;
  stationName?: string;
};

const designations = [
  "DY SS",
  "SS",
  "SM",
  "SMR",
  "APM",
  "P/MAN",
  "P/WOMAN",
  "CTNC",
  "SR.CLERK",
  "S/MASTER",
  "Other",
];

function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeLeavesLoading, setEmployeeLeavesLoading] = useState(false);
  const [editDesignationOpen, setEditDesignationOpen] = useState(false);
  const [designationChoice, setDesignationChoice] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");
  const [savingDesignation, setSavingDesignation] = useState(false);

  async function openEmployeeModal(employee: Employee) {
    setSelectedEmployee(employee);
    setEmployeeModalOpen(true);
    setEmployeeLeavesLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/employees/${employee.employeeId}/leaves`), { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      setEmployeeLeaves(data);
    } catch (err) {
      console.error("Failed to load employee leaves", err);
      setEmployeeLeaves(null);
    } finally {
      setEmployeeLeavesLoading(false);
    }
  }

  function openDesignationEditor() {
    const currentDesignation = employeeLeaves?.designation ?? selectedEmployee?.designation ?? "";
    const known = designations.includes(currentDesignation);
    setDesignationChoice(known ? currentDesignation : "Other");
    setCustomDesignation(known ? "" : currentDesignation);
    setEditDesignationOpen(true);
  }

  async function saveDesignation() {
    const employeeId = employeeLeaves?.employeeId ?? selectedEmployee?.employeeId;
    const nextDesignation = designationChoice === "Other" ? customDesignation.trim() : designationChoice;
    if (!employeeId || !nextDesignation) {
      toast.error("Please select or enter a designation");
      return;
    }

    setSavingDesignation(true);
    try {
      const response = await fetch(apiUrl(`/api/employees/${employeeId}/designation`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: nextDesignation }),
      });

      if (!response.ok) {
        toast.error(`Failed to update designation: ${await response.text()}`);
        return;
      }

      const updated = await response.json();
      setEmployeeLeaves((current: any) => current ? { ...current, designation: updated.designation } : current);
      setSelectedEmployee((current) => current ? { ...current, designation: updated.designation } : current);
      setEditDesignationOpen(false);
      toast.success("Designation updated successfully.");
      await load();
      window.dispatchEvent(new CustomEvent("app:refresh", {
        detail: { pages: ["dashboard", "stations", "employees", "reports"] },
      }));
    } finally {
      setSavingDesignation(false);
    }
  }
  const [q, setQ] = useState("");
  const [stationId, setStationId] = useState("all");
  const [stations, setStations] = useState<Station[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    name: "",
    phone: "",
    designation: designations[0],
    stationId: "",
    dob: "",
    doa: "",
    doj: "",
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return employees.filter(
      (employee) =>
        (stationId === "all" || employee.stationName === stations.find((station) => station.id === stationId)?.stationName) &&
        (!query ||
          employee.name.toLowerCase().includes(query) ||
          employee.employeeId.toLowerCase().includes(query) ||
          (employee.phone ?? "").toLowerCase().includes(query)),
    );
  }, [employees, q, stationId, stations]);

  useEffect(() => {
    let ignore = false;
    load();
    const onAppRefresh = () => {
      if (!ignore) load();
    };
    window.addEventListener("app:refresh", onAppRefresh as EventListener);
    return () => {
      ignore = true;
      window.removeEventListener("app:refresh", onAppRefresh as EventListener);
    };
  }, []);

  async function load() {
    const [stationRes, employeeRes] = await Promise.all([
      fetch(apiUrl("/api/stations"), { cache: "no-store" }),
      fetch(apiUrl("/api/employees"), { cache: "no-store" }),
    ]);
    const stationData = stationRes.ok ? await stationRes.json() : [];
    const employeeData = employeeRes.ok ? await employeeRes.json() : [];
    // Filter out incomplete employee records on the client as a safety net
    const isComplete = (e: any) => e && e.employeeId && e.stationName && e.designation;
    const completeEmployees = Array.isArray(employeeData) ? employeeData.filter(isComplete) : [];
    setStations(stationData);
    setEmployees(completeEmployees);
    setForm((current) => ({ ...current, stationId: current.stationId || stationData[0]?.id || "" }));
  }

  async function createEmployee() {
    if (!form.employeeId.trim() || !form.name.trim() || !form.stationId) {
      toast.error("Employee ID, name and station are required");
      return;
    }

    const response = await fetch(apiUrl("/api/employees"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      toast.error(`Failed to create employee: ${await response.text()}`);
      return;
    }

    toast.success("Employee created");
    setShowForm(false);
    setForm({
      employeeId: "",
      name: "",
      phone: "",
      designation: designations[0],
      stationId: stations[0]?.id || "",
      dob: "",
      doa: "",
      doj: "",
    });
    await load();
  }

  return (
    <AppLayout
      title="Employees"
      subtitle={`${employees.length} workers assigned across ${stations.length} stations`}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search by employee ID, name or phone..."
            className="pl-9"
          />
        </div>
        <Select value={stationId} onValueChange={setStationId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {stations.map((station) => (
              <SelectItem key={station.id} value={station.id}>
                {station.stationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Cancel" : "Add Employee"}
        </Button>
      </div>
      <Dialog open={employeeModalOpen} onOpenChange={setEmployeeModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              {selectedEmployee ? `${selectedEmployee.name} · ${selectedEmployee.employeeId}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            {employeeLeavesLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading...</div>
            ) : !employeeLeaves ? (
              <div className="p-6 text-sm text-muted-foreground">No leave records found.</div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>Employee ID: <strong>{employeeLeaves.employeeId}</strong></div>
                  <div>Name: <strong>{employeeLeaves.employeeName}</strong></div>
                  <div>Current Designation: <strong>{employeeLeaves.designation}</strong></div>
                  <div>Station: <strong>{employeeLeaves.stationName ?? "-"}</strong></div>
                  <div>DOB: <strong>{employeeLeaves.dob ?? "-"}</strong></div>
                  <div>DOJ: <strong>{employeeLeaves.doj ?? "-"}</strong></div>
                  <div>DOA: <strong>{employeeLeaves.doa ?? "-"}</strong></div>
                  <div>Phone: <strong>{employeeLeaves.phone ?? "-"}</strong></div>
                  <div>Latest Leave Date: <strong>{employeeLeaves.latestLeaveDate ?? "-"}</strong></div>
                  <div>Leaves Used This Month: <strong>{employeeLeaves.leavesUsedThisMonth ?? 0}</strong></div>
                  <div>Current Status: <strong>{employeeLeaves.currentStatus ?? "Present"}</strong></div>
                </div>
                <Button className="mb-4" onClick={openDesignationEditor}>
                  Edit Designation
                </Button>

                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <h3 className="font-display text-lg font-bold">Leave History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-5 py-3 font-medium">From Date</th>
                          <th className="text-left px-5 py-3 font-medium">To Date</th>
                          <th className="text-left px-5 py-3 font-medium">Days</th>
                          <th className="text-left px-5 py-3 font-medium">Reason</th>
                          <th className="text-left px-5 py-3 font-medium">Status</th>
                          <th className="text-left px-5 py-3 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(employeeLeaves.leaveHistory || []).map((leave: any) => (
                          <tr key={leave.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-5 py-3 whitespace-nowrap">{leave.fromDate}</td>
                            <td className="px-5 py-3 whitespace-nowrap">{leave.toDate}</td>
                            <td className="px-5 py-3 font-semibold">{leave.days}</td>
                            <td className="px-5 py-3 text-muted-foreground">{leave.reasonType ?? leave.reason ?? "-"}</td>
                            <td className="px-5 py-3">{leave.status}</td>
                            <td className="px-5 py-3 text-muted-foreground">{leave.source ?? "Manual"}</td>
                          </tr>
                        ))}
                        {(employeeLeaves.leaveHistory || []).length === 0 && (
                          <tr>
                            <td className="px-5 py-5 text-muted-foreground" colSpan={6}>No leave records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDesignationOpen} onOpenChange={setEditDesignationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Designation</DialogTitle>
            <DialogDescription>
              Update only the designation. Employee ID and station will not change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              Current Designation: <strong>{employeeLeaves?.designation ?? selectedEmployee?.designation ?? "-"}</strong>
            </div>
            <Select value={designationChoice} onValueChange={setDesignationChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {designations.filter((designation) => designation !== "Other").map((designation) => (
                  <SelectItem key={designation} value={designation}>
                    {designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {designationChoice === "Other" && (
              <Input
                value={customDesignation}
                onChange={(event) => setCustomDesignation(event.target.value)}
                placeholder="Enter designation"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDesignationOpen(false)} disabled={savingDesignation}>
              Cancel
            </Button>
            <Button onClick={saveDesignation} disabled={savingDesignation}>
              {savingDesignation ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Employee ID"
              value={form.employeeId}
              onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
            />
            <Input
              placeholder="Employee name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Input
              type="date"
              placeholder="DOB"
              value={form.dob}
              onChange={(event) => setForm({ ...form, dob: event.target.value })}
            />
            <Select
              value={form.designation}
              onValueChange={(value) => setForm({ ...form, designation: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {designations.map((designation) => (
                  <SelectItem key={designation} value={designation}>
                    {designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.stationId}
              onValueChange={(value) => setForm({ ...form, stationId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.stationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="DOA"
              value={form.doa}
              onChange={(event) => setForm({ ...form, doa: event.target.value })}
            />
            <Input
              type="date"
              placeholder="DOJ"
              value={form.doj}
              onChange={(event) => setForm({ ...form, doj: event.target.value })}
            />
          </div>
          <Button className="mt-3" onClick={createEmployee}>
            Create Employee
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((employee) => (
          <div
            key={employee.employeeId}
            role="button"
            tabIndex={0}
            onClick={() => openEmployeeModal(employee)}
            onKeyDown={(e) => (e.key === "Enter" ? openEmployeeModal(employee) : null)}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {initials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                  {employee.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground">{employee.employeeId}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{employee.designation}</div>
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{employee.stationName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{employee.phone}</span>
              </div>
            </div>
            </div>
        ))}
      </div>
    </AppLayout>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
