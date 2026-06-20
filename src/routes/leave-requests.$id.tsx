import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/leave-requests/$id")({
  head: () => ({ meta: [{ title: "Leave Request - Railway LMS" }] }),
  component: LeaveRequestDetail,
});

type LeaveDetail = {
  id: string;
  employeeId: string;
  employeeName?: string;
  designation?: string;
  station?: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  latestLeaveDate?: string | null;
  leavesUsedThisMonth?: number;
  remainingLeaves?: number | null;
  totalAfterApproval?: number | null;
  recommendation?: "APPROVE" | "REJECT" | null;
};

function LeaveRequestDetail() {
  const { id } = Route.useParams();
  const [leave, setLeave] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<null | { latestLeaveDate?: string | null; currentLeaves: number; requestedDays: number; totalAfterApproval: number; exceeded?: boolean }>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(apiUrl(`/api/leave/${id}`), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) setLeave(data);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  async function setStatus(action: "approve" | "reject") {
    if (!leave) return;
    if (action === "approve") {
      // fetch analysis first
      const res = await fetch(apiUrl(`/api/leave/${leave.id}/analysis`));
      if (!res.ok) return alert(`Unable to fetch leave analysis`);
      const analysis = await res.json();
      setWarning({ latestLeaveDate: analysis.latestLeaveDate, currentLeaves: analysis.currentLeaves, requestedDays: analysis.requestedDays, totalAfterApproval: analysis.totalAfterApproval, exceeded: analysis.exceededLimit });
      return;
    }

    // reject
    const res = await fetch(apiUrl(`/api/leave/${leave.id}/reject`), { method: "PATCH" });
    if (!res.ok) return alert(`Unable to reject leave request`);
    const updated = await res.json();
    setLeave(updated);
    alert("Leave rejected");
  }

  async function approveAnyway() {
    if (!leave || !warning) return;
    // re-check analysis to decide whether to force
    const analysisRes = await fetch(apiUrl(`/api/leave/${leave.id}/analysis`));
    if (!analysisRes.ok) return alert("Unable to fetch leave analysis");
    const analysis = await analysisRes.json();
    const force = analysis.totalAfterApproval > 4;
    const res = await fetch(apiUrl(`/api/leave/${leave.id}/approve${force ? "?force=true" : ""}`), { method: "PATCH" });
    if (!res.ok) return alert("Unable to approve leave request");
    const updated = await res.json();
    setWarning(null);
    setLeave(updated);
    alert("Leave approved");
    // notify other views to refresh employee data
    window.dispatchEvent(new CustomEvent("leave:approved", { detail: { employeeId: updated.employeeId } }));
  }

  if (loading) return (
    <AppLayout title="Leave Request">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </AppLayout>
  );

  if (!leave) return (
    <AppLayout title="Not Found">
      <p>Leave request not found</p>
    </AppLayout>
  );

  return (
    <AppLayout title={`Leave: ${leave.employeeId}`} subtitle={leave.employeeName}>
      <Link
        to="/leave-requests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Employee ID</p>
            <p className="font-medium">{leave.employeeId}</p>

            <p className="text-xs text-muted-foreground mt-3">Employee Name</p>
            <p className="font-medium">{leave.employeeName}</p>

            <p className="text-xs text-muted-foreground mt-3">Station</p>
            <p className="font-medium">{leave.station ?? "-"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Requested Days</p>
            <p className="font-medium">{leave.days}</p>

            <p className="text-xs text-muted-foreground mt-3">From - To</p>
            <p className="font-medium">{leave.fromDate} — {leave.toDate}</p>

            <p className="text-xs text-muted-foreground mt-3">Reason</p>
            <p className="font-medium">{leave.reason}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Latest Leave Date</p>
            <p className="font-medium">{leave.latestLeaveDate ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Leaves Used This Month</p>
            <p className="font-medium">{leave.leavesUsedThisMonth ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Remaining Leaves</p>
            <p className="font-medium">{leave.remainingLeaves ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total After Approval</p>
            <p className="font-medium">{leave.totalAfterApproval ?? "-"}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm">Recommendation: {leave.recommendation ?? "-"}</p>
          {leave.recommendation === "REJECT" && (
            <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm font-semibold text-destructive">
              Monthly Leave Limit Exceeded — Recommendation: REJECT
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          {leave.status === "Pending" && (
            <>
                  <Button onClick={() => setStatus("approve")}>Approve</Button>
                  <Button variant="outline" onClick={() => setStatus("reject")}>Reject</Button>
            </>
          )}
        </div>
      </div>
          <AlertDialog open={Boolean(warning)} onOpenChange={(open) => !open && setWarning(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                    <AlertDialogTitle>{warning?.exceeded ? "Monthly Leave Limit Exceeded" : "Approve Leave"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      <div className="space-y-2 text-sm">
                        <div>Employee: <strong>{leave?.employeeName ?? leave?.employeeId}</strong></div>
                        <div>Latest Leave Taken: <strong>{warning?.latestLeaveDate ?? "-"}</strong></div>
                        <div>Leaves Used This Month: <strong>{warning?.currentLeaves} days</strong></div>
                        <div>Requested Days: <strong>{warning?.requestedDays} days</strong></div>
                        <div>Total After Approval: <strong>{warning?.totalAfterApproval} days</strong></div>
                        {warning?.exceeded ? (
                          <div className="mt-2 text-destructive font-semibold">⚠ Monthly Leave Limit Exceeded</div>
                        ) : (
                          <div className="mt-2 text-muted-foreground">Do you want to approve?</div>
                        )}
                      </div>
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
