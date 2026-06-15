import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { leaveRequests, type LeaveStatus } from "@/lib/mockData";
import { Eye, Check, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/leave-requests")({
  head: () => ({ meta: [{ title: "Leave Requests — Railway LMS" }] }),
  component: LeaveRequestsPage,
});

function LeaveRequestsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | LeaveStatus>("all");

  const filtered = leaveRequests.filter(r => {
    const q = query.toLowerCase();
    const matchQ = !q || r.employeeName.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    const matchF = filter === "all" || r.status === filter;
    return matchQ && matchF;
  });

  return (
    <AppLayout title="Leave Requests" subtitle="All incoming leave requests from workers via WhatsApp">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-5 border-b border-border">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, employee ID, or request ID..." className="pl-9" />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Request ID</th>
                <th className="text-left px-5 py-3 font-medium">Employee</th>
                <th className="text-left px-5 py-3 font-medium">From</th>
                <th className="text-left px-5 py-3 font-medium">To</th>
                <th className="text-left px-5 py-3 font-medium">Days</th>
                <th className="text-left px-5 py-3 font-medium">Reason</th>
                <th className="text-left px-5 py-3 font-medium">Requested</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{r.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{r.employeeId}</div>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs">{r.fromDate}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs">{r.toDate}</td>
                  <td className="px-5 py-3 font-semibold">{r.days}</td>
                  <td className="px-5 py-3 max-w-[200px] truncate text-muted-foreground">{r.reason}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-xs text-muted-foreground">{r.requestDate}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to="/leave-requests/$id" params={{ id: r.id }}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:bg-success/10" onClick={() => toast.success(`Approved ${r.id}`)}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => toast.error(`Rejected ${r.id}`)}><X className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No requests match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
