import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { getEmployee, getRequest, MONTHLY_LIMIT, recommendationFor, leaveHistoryFor } from "@/lib/mockData";
import { ArrowLeft, Phone, Calendar, User, Building2, CheckCircle2, XCircle, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leave-requests/$id")({
  head: () => ({ meta: [{ title: "Leave Request Details — Railway LMS" }] }),
  component: LeaveRequestDetails,
  notFoundComponent: () => <div className="p-10 text-center">Request not found</div>,
});

function LeaveRequestDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const req = getRequest(id);
  if (!req) return <AppLayout title="Not Found"><p>Request not found</p></AppLayout>;
  const emp = getEmployee(req.employeeId);
  if (!emp) return <AppLayout title="Not Found"><p>Employee not found</p></AppLayout>;

  const used = emp.leaveUsedThisMonth;
  const remaining = Math.max(0, MONTHLY_LIMIT - used);
  const rec = recommendationFor(emp.id, req.days);
  const history = leaveHistoryFor(emp.id);
  const lastLeave = history[0]?.date ?? "—";

  return (
    <AppLayout title={`Request ${req.id}`} subtitle="Review leave request and take action">
      <Link to="/leave-requests" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to requests
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Employee Information</h2>
              <StatusBadge status={req.status} />
            </div>
            <div className="p-5 flex flex-col sm:flex-row gap-5">
              <Avatar className="h-20 w-20 shrink-0"><AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{emp.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
              <div className="grid sm:grid-cols-2 gap-4 flex-1 min-w-0">
                <InfoRow icon={User} label="Name" value={emp.name} />
                <InfoRow icon={User} label="Employee ID" value={emp.id} mono />
                <InfoRow icon={Phone} label="Phone" value={emp.phone} />
                <InfoRow icon={Building2} label="Department" value={emp.department} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="p-5 border-b border-border"><h2 className="font-display text-lg font-bold">Leave Information</h2></div>
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <InfoRow icon={Calendar} label="Leave From" value={req.fromDate} />
              <InfoRow icon={Calendar} label="Leave To" value={req.toDate} />
              <InfoRow icon={Calendar} label="Requested Days" value={`${req.days} day${req.days > 1 ? "s" : ""}`} />
              <InfoRow icon={Calendar} label="Request Date" value={req.requestDate} />
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm bg-muted/40 rounded-lg p-3">{req.reason}</p>
              </div>
            </div>
          </div>

          <div className={cn(
            "rounded-2xl border-2 shadow-sm p-5 sm:p-6",
            rec.decision === "APPROVE" ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                rec.decision === "APPROVE" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
              )}>
                {rec.decision === "APPROVE" ? <Sparkles className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Recommendation</p>
                <p className={cn("font-display text-2xl font-bold mt-1", rec.decision === "APPROVE" ? "text-success" : "text-destructive")}>
                  Recommended: {rec.decision}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
              </div>
            </div>
          </div>

          {req.status === "pending" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => { toast.success(`Approved request ${req.id}`); navigate({ to: "/leave-requests" }); }}>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Approve Leave
              </Button>
              <Button size="lg" variant="destructive" className="flex-1" onClick={() => { toast.error(`Rejected request ${req.id}`); navigate({ to: "/leave-requests" }); }}>
                <XCircle className="h-5 w-5 mr-2" /> Reject Leave
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="font-display text-lg font-bold mb-4">Leave Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Used this month</span>
                  <span className="font-semibold">{used} / {MONTHLY_LIMIT}</span>
                </div>
                <Progress value={(used / MONTHLY_LIMIT) * 100} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Monthly Limit</p>
                  <p className="font-display text-2xl font-bold">{MONTHLY_LIMIT}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={cn("font-display text-2xl font-bold", remaining > 0 ? "text-success" : "text-destructive")}>{remaining}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Last Leave Date</p>
                <p className="text-sm font-semibold mt-1">{lastLeave}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h2 className="font-display text-lg font-bold mb-3">Recent History</h2>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium">{h.date}</div>
                    <div className="text-xs text-muted-foreground truncate">{h.reason}</div>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-semibold truncate", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}
