import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Search,
  Menu,
  Train,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/stations", label: "Stations", icon: MapPin },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/leave-requests", label: "Leave Requests", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

function SidebarBody({ onNav }: { onNav?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stations, setStations] = useState<Array<{ id: string; stationName: string }>>([]);

  useEffect(() => {
    let ignore = false;

    async function loadStations() {
      try {
        const response = await fetch(apiUrl("/api/stations"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data)) setStations(data);
      } catch (error) {
        console.warn("Unable to load stations for sidebar.", error);
      }
    }

    loadStations();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg">
          <Train className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-base font-bold leading-tight truncate">Railway LMS</div>
          <div className="text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">
            Leave Management
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <div key={item.to}>
              <Link
                to={item.to}
                onClick={onNav}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              {item.to === "/stations" && stations.length > 0 && (
                <div className="mt-1 mb-2 ml-6 space-y-1">
                  {stations.map((station) => {
                    const stationPath = `/stations/${station.id}`;
                    const stationActive = pathname === stationPath;
                    return (
                      <Link
                        key={station.id}
                        to="/stations/$id"
                        params={{ id: station.id }}
                        onClick={onNav}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          stationActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span className="truncate">{station.stationName}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              MS
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">M. Subramaniam</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">Railway Manager</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search employees, requests...",
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const activeSearchValue = searchValue ?? internalSearchValue;

  function handleSearchChange(value: string) {
    if (searchValue === undefined) setInternalSearchValue(value);
    onSearchChange?.(value);
  }

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
                {subtitle && (
                  <p className="hidden sm:block text-xs text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="hidden md:flex justify-center max-w-md mx-auto w-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={activeSearchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 bg-muted/40 border-transparent focus:bg-background"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  MS
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">{children}</main>
      </div>
    </div>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}

export function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected" | "Pending" | "Approved" | "Rejected";
}) {
  const normalized = status.toLowerCase() as "pending" | "approved" | "rejected";
  const map = {
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  } as const;
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", map[normalized])}>
      {status}
    </Badge>
  );
}
