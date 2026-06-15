import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Users, CalendarDays, BarChart3, Settings, Bell, Search, Menu, Train, LogOut, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/leave-requests", label: "Leave Requests", icon: FileText },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarDays },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
          <Train className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight truncate">Railway LMS</div>
          <div className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">Leave Management</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9"><AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">MS</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">M. Subramaniam</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">Station Manager</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarBody />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden grid h-9 w-9 place-items-center rounded-lg hover:bg-muted">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none">
                  <SidebarBody onNav={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-bold truncate">{title}</h1>
                {subtitle && <p className="hidden sm:block text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="hidden md:flex justify-center max-w-md mx-auto w-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees, requests..." className="pl-9 bg-muted/40 border-transparent focus:bg-background" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <button className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">MS</AvatarFallback></Avatar>
                  <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">M. Subramaniam</div>
                    <div className="text-xs text-muted-foreground font-normal">manager@railway.gov.in</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive"><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">{children}</main>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  } as const;
  return <Badge variant="outline" className={cn("capitalize font-medium", map[status])}>{status}</Badge>;
}
