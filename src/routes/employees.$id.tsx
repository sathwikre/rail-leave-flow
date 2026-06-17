import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { getEmployee, leaveHistoryFor, MONTHLY_LIMIT } from "@/lib/mockData";
import { ArrowLeft, Phone, Building2, Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({ meta: [{ title: "Employee Profile — Railway LMS" }] }),
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const { id } = Route.useParams();
  const emp = getEmployee(id);
  if (!emp) return <AppLayout title="Not Found"><p>Employee not found</p></AppLayout>;
  const history = leaveHistoryFor(emp.id);
  const used = emp.leaveUsedThisMonth;
  const remaining = MONTHLY_LIMIT - used;
  const lastLeave = history[0]?.date ?? "—";
  const presentDays = 22 - used;
  const attendancePct = Math.round((presentDays / 22) * 100);

  return (
    <AppLayout title={emp.name} subtitle={emp.department}>
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-center">
          <Avatar className="h-24 w-24 mx-auto"><AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{emp.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
          <h2 className="font-display text-xl font-bold mt-4">{emp.name}</h2>
          <p className="text-sm font-mono text-muted-foreground">{emp.id}</p>
          <div className="mt-5 space-y-3 text-left">
            <Row icon={Phone} label="Phone" value={emp.phone} />
            <Row icon={Building2} label="Department" value={emp.department} />
            <Row icon={Calendar} label="Joined" value={emp.joiningDate} />
            <Row icon={User} label="Status" value="Active" />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Used" value={used} suffix={`/ ${MONTHLY_LIMIT}`} />
            <Stat label="Remaining" value={remaining} tone={remaining > 0 ? "success" : "destructive"} />
            <Stat label="Present" value={presentDays} suffix="days" />
            <Stat label="Attendance" value={`${attendancePct}%`} tone="success" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Leave Taken</p>
              <p className="font-display text-lg font-bold mt-1">{lastLeave}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total This Month</p>
              <p className="font-display text-lg font-bold mt-1">{used} day{used !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
            <h3 className="font-display text-lg font-bold mb-3">Monthly Progress</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Leave usage</span>
              <span className="font-semibold">{used}/{MONTHLY_LIMIT}</span>
            </div>
            <Progress value={(used / MONTHLY_LIMIT) * 100} className="h-3" />
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border"><h3 className="font-display text-lg font-bold">Leave History</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr><th className="text-left px-5 py-3 font-medium">Date</th><th className="text-left px-5 py-3 font-medium">Days</th><th className="text-left px-5 py-3 font-medium">Reason</th><th className="text-left px-5 py-3 font-medium">Status</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3 whitespace-nowrap text-xs">{h.date}</td>
                      <td className="px-5 py-3 font-semibold">{h.days}</td>
                      <td className="px-5 py-3 text-muted-foreground">{h.reason}</td>
                      <td className="px-5 py-3"><StatusBadge status={h.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: any; suffix?: string; tone?: "success" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${cls}`}>{value}{suffix && <span className="text-sm text-muted-foreground font-medium ml-1">{suffix}</span>}</p>
    </div>
  );
}
