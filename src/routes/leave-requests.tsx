import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/leave-requests")({
  head: () => ({ meta: [{ title: "Leave Requests - Railway LMS" }] }),
  component: LeaveRequestsPage,
});

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  source?: "Manual" | "Email";
};

function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", fromDate: "", toDate: "", reason: "" });
  const [warning, setWarning] = useState<null | {
    id: string;
    employeeName?: string;
    latestLeaveDate?: string | null;
    currentLeaves: number;
    requestedDays: number;
    totalAfterApproval: number;
    exceeded?: boolean;
  }>(null);

  const calculatedDays = useMemo(() => {
    if (!form.fromDate || !form.toDate) return 0;
    const from = new Date(`${form.fromDate}T00:00:00.000Z`);
    const to = new Date(`${form.toDate}T00:00:00.000Z`);
    if (to < from) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  }, [form.fromDate, form.toDate]);

  useEffect(() => {
    loadRequests();
    const iv = setInterval(loadRequests, 30000);
    return () => clearInterval(iv);
  }, []);

  async function loadRequests() {
    const response = await fetch(apiUrl("/api/leave"), { cache: "no-store" });
    if (response.ok) setRequests(await response.json());
  }

  async function createLeave() {
    if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
      toast.error("Employee ID, dates and reason are required");
      return;
    }

    const response = await fetch(apiUrl("/api/leave"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      toast.error(`Failed to create leave request: ${await response.text()}`);
      return;
    }

    toast.success("Leave request created");
    setForm({ employeeId: "", fromDate: "", toDate: "", reason: "" });
    setShowForm(false);
    await loadRequests();
  }

  async function setStatus(id: string, action: "approve" | "reject") {
    if (action === "approve") {
      // fetch analysis first and show confirmation dialog
      const res = await fetch(apiUrl(`/api/leave/${id}/analysis`));
      if (!res.ok) {
        toast.error("Unable to fetch leave analysis");
        return;
      }
      const analysis = await res.json();
      const req = requests.find((r) => r.id === id);
      setWarning({
        id,
        employeeName: req?.employeeName || req?.employeeId,
        latestLeaveDate: analysis.latestLeaveDate,
        currentLeaves: analysis.currentLeaves,
        requestedDays: analysis.requestedDays,
        totalAfterApproval: analysis.totalAfterApproval,
        exceeded: analysis.exceededLimit,
      } as any);
      // store exceeded flag in the DOM via a dataset on the element? Instead, keep logic in approveAnyway by refetching analysis when approving.
      return;
    }

    // reject
    const response = await fetch(apiUrl(`/api/leave/${id}/reject`), { method: "PATCH" });
    if (!response.ok) {
      toast.error(`Unable to reject leave request`);
      return;
    }
    toast.success("Leave rejected");
    await loadRequests();
  }

  async function approveAnyway() {
    if (!warning) return;
    // re-fetch analysis to determine if exceeded
    const analysisRes = await fetch(apiUrl(`/api/leave/${warning.id}/analysis`));
    if (!analysisRes.ok) {
      toast.error("Unable to fetch leave analysis");
      return;
    }
    const analysis = await analysisRes.json();
    const force = analysis.totalAfterApproval > 4;
    const response = await fetch(apiUrl(`/api/leave/${warning.id}/approve${force ? "?force=true" : ""}`), {
      method: "PATCH",
    });
    if (!response.ok) {
      toast.error("Unable to approve leave request");
      return;
    }
    setWarning(null);
    toast.success("Leave approved");
    // notify other views to refresh employee data
    const reqItem = requests.find((r) => r.id === warning.id);
    if (reqItem) window.dispatchEvent(new CustomEvent("leave:approved", { detail: { employeeId: reqItem.employeeId } }));
    await loadRequests();
  }

  return (
    <AppLayout
      title="Leave Requests"
        subtitle="Manual entries from worker WhatsApp requests"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => loadRequests()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>
      }
    >
      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Employee ID"
              value={form.employeeId}
              onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
            />
            <Input
              type="date"
              value={form.fromDate}
              onChange={(event) => setForm({ ...form, fromDate: event.target.value })}
            />
            <Input
              type="date"
              value={form.toDate}
              onChange={(event) => setForm({ ...form, toDate: event.target.value })}
            />
            <Input
              placeholder="Reason"
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              Days: <span className="font-bold">{calculatedDays}</span>
            </div>
          </div>
          <Button className="mt-3" onClick={createLeave}>
            Create Pending Request
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Employee</th>
                  <th className="text-left px-5 py-3 font-medium">Source</th>
                <th className="text-left px-5 py-3 font-medium">From</th>
                <th className="text-left px-5 py-3 font-medium">To</th>
                <th className="text-left px-5 py-3 font-medium">Days</th>
                <th className="text-left px-5 py-3 font-medium">Reason</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <Link to="/employees/$id" params={{ id: request.employeeId }} className="font-semibold">
                      {request.employeeName ?? request.employeeId}
                    </Link>
                    <div className="text-xs font-mono text-muted-foreground">{request.employeeId}</div>
                  </td>
                    <td className="px-5 py-3">
                      {request.source === "Email" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                          Email
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-border">
                          Manual
                        </Badge>
                      )}
                    </td>
                  <td className="px-5 py-3 whitespace-nowrap">{request.fromDate}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{request.toDate}</td>
                  <td className="px-5 py-3 font-semibold">{request.days}</td>
                  <td className="px-5 py-3 text-muted-foreground">{request.reason}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-5 py-3">
                    {request.status === "Pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setStatus(request.id, "approve")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(request.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={Boolean(warning)} onOpenChange={(open) => !open && setWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monthly Leave Limit Exceeded</AlertDialogTitle>
            <AlertDialogDescription>
              {warning ? (
                <div className="space-y-2 text-sm">
                  <div>Employee: <strong>{warning.employeeName}</strong></div>
                  <div>Latest Leave Taken: <strong>{warning.latestLeaveDate ?? "-"}</strong></div>
                  <div>Leaves Used This Month: <strong>{warning.currentLeaves} days</strong></div>
                  <div>Requested Days: <strong>{warning.requestedDays} days</strong></div>
                  <div>Total After Approval: <strong>{warning.totalAfterApproval} days</strong></div>
                  {warning.exceeded ? (
                    <div className="mt-2 text-destructive font-semibold">⚠ Monthly Leave Limit Exceeded</div>
                  ) : (
                    <div className="mt-2 text-muted-foreground">Do you want to approve?</div>
                  )}
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={approveAnyway}>{warning?.exceeded ? "Approve Anyway" : "Approve"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
