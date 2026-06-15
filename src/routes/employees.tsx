import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { employees, MONTHLY_LIMIT } from "@/lib/mockData";
import { Search, Phone, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Railway LMS" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const depts = Array.from(new Set(employees.map(e => e.department)));
  const filtered = employees.filter(e =>
    (dept === "all" || e.department === dept) &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.id.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppLayout title="Employees" subtitle={`${employees.length} railway workers across ${depts.length} departments`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or employee ID..." className="pl-9" />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(emp => {
          const remaining = MONTHLY_LIMIT - emp.leaveUsedThisMonth;
          return (
            <Link key={emp.id} to="/employees/$id" params={{ id: emp.id }} className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0"><AvatarFallback className="bg-primary/10 text-primary font-bold">{emp.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{emp.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{emp.id}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{emp.department}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{emp.phone}</span></div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Leave used</span>
                  <span className="font-semibold">{emp.leaveUsedThisMonth}/{MONTHLY_LIMIT}</span>
                </div>
                <Progress value={(emp.leaveUsedThisMonth / MONTHLY_LIMIT) * 100} className="h-1.5" />
                <p className="text-xs mt-2 text-muted-foreground">
                  Balance: <span className={remaining > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>{remaining} day{remaining !== 1 ? "s" : ""}</span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}
