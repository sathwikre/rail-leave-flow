import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MONTHLY_LIMIT } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Railway LMS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [limit, setLimit] = useState(MONTHLY_LIMIT);
  return (
    <AppLayout title="Settings" subtitle="Manage system preferences and notifications">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Leave Policy" description="Default rules applied to all workers">
          <div className="space-y-4">
            <div>
              <Label>Monthly Leave Limit (days)</Label>
              <Input type="number" min={1} max={31} value={limit} onChange={e => setLimit(Number(e.target.value))} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1.5">Workers cannot exceed {limit} leave days per calendar month.</p>
            </div>
            <Button onClick={() => toast.success("Leave policy updated")}>Save Changes</Button>
          </div>
        </Card>

        <Card title="Manager Profile" description="Your account details">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">MS</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold">M. Subramaniam</div>
              <div className="text-xs text-muted-foreground">Station Manager · Chennai Central</div>
            </div>
          </div>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input defaultValue="M. Subramaniam" className="mt-1.5" /></div>
            <div><Label>Email</Label><Input defaultValue="manager@railway.gov.in" className="mt-1.5" /></div>
            <Button onClick={() => toast.success("Profile saved")}>Update Profile</Button>
          </div>
        </Card>

        <Card title="Notifications" description="How you receive updates">
          <div className="space-y-4">
            <Row label="WhatsApp alerts" desc="Get notified for new requests" defaultOn />
            <Row label="Email digest" desc="Daily summary at 8 AM" defaultOn />
            <Row label="SMS notifications" desc="For urgent leave only" />
            <Row label="Weekly report" desc="Sent every Monday" defaultOn />
          </div>
        </Card>

        <Card title="System Preferences" description="App-wide settings" className="lg:col-span-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Row label="Auto-approve within limit" desc="Skip review if under monthly cap" />
            <Row label="Show system recommendations" desc="Display suggested decisions" defaultOn />
            <Row label="Compact tables" desc="Denser layout on lists" />
            <Row label="Dark mode" desc="Use dark theme across the app" />
            <Row label="Show employee photos" desc="Display avatars in lists" defaultOn />
            <Row label="Sound alerts" desc="Audible notification on new requests" />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function Card({ title, description, children, className = "" }: any) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm ${className}`}>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      {children}
    </div>
  );
}

function Row({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}
