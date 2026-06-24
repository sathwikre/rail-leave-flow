import { createFileRoute } from "@tanstack/react-router";
import { Building2, Phone, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

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
  dob?: string | null;
  doa?: string | null;
  doj?: string | null;
};

type RemarkType = "Excellent" | "Good" | "General" | "Warning" | "Disciplinary";
type EmployeeRemark = {
  id: string;
  employeeId: string;
  remarkType: RemarkType;
  title: string;
  description: string;
  date: string;
  addedBy: string;
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

const remarkTypes: RemarkType[] = ["Excellent", "Good", "General", "Warning", "Disciplinary"];

function EmployeesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<any | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeLeavesLoading, setEmployeeLeavesLoading] = useState(false);
<<<<<<< HEAD
  const [editDesignationOpen, setEditDesignationOpen] = useState(false);
  const [designationChoice, setDesignationChoice] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");
  const [savingDesignation, setSavingDesignation] = useState(false);
  const [remarks, setRemarks] = useState<EmployeeRemark[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [addRemarkOpen, setAddRemarkOpen] = useState(false);
  const [savingRemark, setSavingRemark] = useState(false);
  const [remarkForm, setRemarkForm] = useState({
    remarkType: "General" as RemarkType,
    title: "",
    description: "",
    date: todayInputDate(),
=======
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    employeeId: "",
    name: "",
    phone: "",
    designation: "",
    stationId: "",
    dob: "",
    doa: "",
    doj: "",
>>>>>>> 593b618f7d8cffc6941e685de84f9ca432f347d0
  });

  async function openEmployeeModal(employee: Employee) {
    setSelectedEmployee(employee);
    setEmployeeModalOpen(true);
    setEmployeeLeavesLoading(true);
    setRemarks([]);
    loadEmployeeRemarks(employee.employeeId);
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

<<<<<<< HEAD
  async function loadEmployeeRemarks(employeeId: string) {
    setRemarksLoading(true);
    try {
      const res = await fetch(`/employees/${encodeURIComponent(employeeId)}/remarks`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setRemarks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load employee remarks", err);
      setRemarks([]);
    } finally {
      setRemarksLoading(false);
    }
  }

  function openDesignationEditor() {
    const currentDesignation = employeeLeaves?.designation ?? selectedEmployee?.designation ?? "";
    const known = designations.includes(currentDesignation);
    setDesignationChoice(known ? currentDesignation : "Other");
    setCustomDesignation(known ? "" : currentDesignation);
    setEditDesignationOpen(true);
  }

  function openRemarkDialog() {
    setRemarkForm({
      remarkType: "General",
      title: "",
      description: "",
      date: todayInputDate(),
    });
    setAddRemarkOpen(true);
  }

  async function saveRemark() {
    const employeeId = employeeLeaves?.employeeId ?? selectedEmployee?.employeeId;
    if (!employeeId) {
      toast.error("Employee ID is missing. Please reopen the employee details.");
      return;
    }
    if (!remarkForm.title.trim() || !remarkForm.description.trim()) {
      toast.error("Remark title and description are required");
      return;
    }

    setSavingRemark(true);
    try {
      const remarkUrl = `/employees/${encodeURIComponent(employeeId)}/remarks`;
      const response = await fetch(remarkUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarkType: remarkForm.remarkType,
          title: remarkForm.title.trim(),
          description: remarkForm.description.trim(),
          date: remarkForm.date,
          addedBy: "Traffic Inspector",
        }),
      });

      if (!response.ok) {
        toast.error(`Failed to save remark: ${await responseErrorMessage(response)}`);
        return;
      }

      setAddRemarkOpen(false);
      toast.success("Remark saved successfully.");
      await loadEmployeeRemarks(employeeId);
    } catch (err) {
      console.error("Failed to save employee remark", err);
      toast.error("Failed to save remark. Please check that the backend server is running.");
    } finally {
      setSavingRemark(false);
    }
  }

  async function saveDesignation() {
=======
  function openDetailsEditor() {
    const stationName = employeeLeaves?.stationName ?? selectedEmployee?.stationName ?? "";
    const currentStation = stations.find((station) => station.stationName === stationName);
    setEditForm({
      employeeId: employeeLeaves?.employeeId ?? selectedEmployee?.employeeId ?? "",
      name: employeeLeaves?.employeeName ?? selectedEmployee?.name ?? "",
      phone: employeeLeaves?.phone ?? selectedEmployee?.phone ?? "",
      designation: employeeLeaves?.designation ?? selectedEmployee?.designation ?? "",
      stationId: currentStation?.id ?? stations[0]?.id ?? "",
      dob: employeeLeaves?.dob ?? selectedEmployee?.dob ?? "",
      doa: employeeLeaves?.doa ?? selectedEmployee?.doa ?? "",
      doj: employeeLeaves?.doj ?? selectedEmployee?.doj ?? "",
    });
    setEditDetailsOpen(true);
  }

  async function saveDetails() {
>>>>>>> 593b618f7d8cffc6941e685de84f9ca432f347d0
    const employeeId = employeeLeaves?.employeeId ?? selectedEmployee?.employeeId;
    if (!employeeId || !editForm.employeeId.trim() || !editForm.name.trim() || !editForm.designation.trim() || !editForm.stationId) {
      toast.error("Employee ID, name, designation and station are required");
      return;
    }

    setSavingDetails(true);
    try {
      const response = await fetch(apiUrl(`/api/employees/${employeeId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        toast.error(`Failed to update employee: ${await response.text()}`);
        return;
      }

      const updated = await response.json();
      setEmployeeLeaves((current: any) => current ? {
        ...current,
        employeeId: updated.employeeId,
        employeeName: updated.name,
        phone: updated.phone,
        designation: updated.designation,
        stationName: updated.stationName,
        dob: updated.dob,
        doa: updated.doa,
        doj: updated.doj,
      } : current);
      setSelectedEmployee((current) => current ? { ...current, ...updated } : current);
      setEditDetailsOpen(false);
      toast.success("Employee details updated successfully.");
      await load();
      window.dispatchEvent(new CustomEvent("app:refresh", {
        detail: { pages: ["dashboard", "stations", "employees", "reports"] },
      }));
    } finally {
      setSavingDetails(false);
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
<<<<<<< HEAD
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button onClick={openDesignationEditor}>
                    Edit Designation
                  </Button>
                  <Button variant="outline" onClick={openRemarkDialog}>
                    Add Remark
                  </Button>
                </div>
=======
                <Button className="mb-4" onClick={openDetailsEditor}>
                  Edit Employee Details
                </Button>
>>>>>>> 593b618f7d8cffc6941e685de84f9ca432f347d0

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-border">
                      <h3 className="font-display text-lg font-bold">Remarks History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-5 py-3 font-medium">Date</th>
                            <th className="text-left px-5 py-3 font-medium">Remark Type</th>
                            <th className="text-left px-5 py-3 font-medium">Remark Title</th>
                            <th className="text-left px-5 py-3 font-medium">Added By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {remarks.map((remark) => (
                            <tr key={remark.id} className="border-t border-border hover:bg-muted/30">
                              <td className="px-5 py-3 whitespace-nowrap">{remark.date}</td>
                              <td className="px-5 py-3">
                                <Badge variant="outline" className={remarkBadgeClass(remark.remarkType)}>
                                  {remark.remarkType}
                                </Badge>
                              </td>
                              <td className="px-5 py-3">{remark.title}</td>
                              <td className="px-5 py-3 text-muted-foreground">{remark.addedBy}</td>
                            </tr>
                          ))}
                          {remarks.length === 0 && (
                            <tr>
                              <td className="px-5 py-5 text-muted-foreground" colSpan={4}>
                                {remarksLoading ? "Loading remarks..." : "No remarks found."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>
              Change employee ID, name, phone, designation, station and service dates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Employee ID"
              value={editForm.employeeId}
              onChange={(event) => setEditForm({ ...editForm, employeeId: event.target.value })}
            />
            <Input
              placeholder="Employee name"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
            />
            <Input
              placeholder="Phone number"
              value={editForm.phone}
              onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
            />
            <Input
              placeholder="Designation"
              value={editForm.designation}
              onChange={(event) => setEditForm({ ...editForm, designation: event.target.value })}
            />
            <Select
              value={editForm.stationId}
              onValueChange={(value) => setEditForm({ ...editForm, stationId: value })}
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
              value={editForm.dob}
              onChange={(event) => setEditForm({ ...editForm, dob: event.target.value })}
            />
            <Input
              type="date"
              value={editForm.doj}
              onChange={(event) => setEditForm({ ...editForm, doj: event.target.value })}
            />
            <Input
              type="date"
              value={editForm.doa}
              onChange={(event) => setEditForm({ ...editForm, doa: event.target.value })}
            />
            {editForm.employeeId !== (employeeLeaves?.employeeId ?? selectedEmployee?.employeeId ?? "") && (
              <div className="sm:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Leave history will be moved to the new employee ID automatically.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsOpen(false)} disabled={savingDetails}>
              Cancel
            </Button>
            <Button onClick={saveDetails} disabled={savingDetails}>
              {savingDetails ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addRemarkOpen} onOpenChange={setAddRemarkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Remark</DialogTitle>
            <DialogDescription>
              Add a remark for {employeeLeaves?.employeeName ?? selectedEmployee?.name ?? "this employee"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={remarkForm.remarkType}
              onValueChange={(value) => setRemarkForm((current) => ({ ...current, remarkType: value as RemarkType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Remark Type" />
              </SelectTrigger>
              <SelectContent>
                {remarkTypes.map((remarkType) => (
                  <SelectItem key={remarkType} value={remarkType}>
                    {remarkType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={remarkForm.title}
              onChange={(event) => setRemarkForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Remark Title"
            />
            <Textarea
              value={remarkForm.description}
              onChange={(event) => setRemarkForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Remark Description"
            />
            <Input
              type="date"
              value={remarkForm.date}
              onChange={(event) => setRemarkForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRemarkOpen(false)} disabled={savingRemark}>
              Cancel
            </Button>
            <Button onClick={saveRemark} disabled={savingRemark}>
              {savingRemark ? "Saving..." : "Save Remark"}
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

function todayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function remarkBadgeClass(type: RemarkType) {
  const classes = {
    Excellent: "bg-green-50 text-green-700 border-green-200",
    Good: "bg-blue-50 text-blue-700 border-blue-200",
    General: "bg-muted/40 text-muted-foreground border-border",
    Warning: "bg-orange-50 text-orange-700 border-orange-200",
    Disciplinary: "bg-red-50 text-red-700 border-red-200",
  };
  return classes[type];
}

async function responseErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`.trim();

  try {
    const data = JSON.parse(text);
    return data.message ?? data.error ?? text;
  } catch (e) {
    return text;
  }
}
