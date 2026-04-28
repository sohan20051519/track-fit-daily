import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { WEEKDAYS } from "@/lib/weekdays";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

function SettingsPage() {
  const { user } = useAuth();
  const [freq, setFreq] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("weight_track_frequency, preferred_weigh_day")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFreq((data.weight_track_frequency as "daily" | "weekly") ?? "daily");
        setDay(data.preferred_weigh_day ?? 1);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      weight_track_frequency: freq,
      preferred_weigh_day: day,
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
    setBusy(false);
  };

  return (
    <div className="space-y-4 stagger sm:space-y-5">
      <div className="rounded-3xl glass p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Preferences</p>
        <h1 className="mt-1 font-serif-display text-4xl leading-none sm:text-5xl">Settings</h1>
      </div>

      <div className="rounded-3xl glass p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-focus text-primary-foreground shadow-soft">
            <Scale className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">Weight tracking</h2>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cadence</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["daily", "weekly"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                className={cn(
                  "pressable rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition-all",
                  freq === f
                    ? "border-foreground bg-foreground text-background shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >{f}</button>
            ))}
          </div>
        </div>

        {freq === "weekly" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Weigh-in day</Label>
            <Select value={String(day)} onValueChange={(v) => setDay(parseInt(v))}>
              <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((w) => <SelectItem key={w.idx} value={String(w.idx)}>{w.long}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button onClick={save} disabled={busy} className="h-12 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card">
          <CheckCircle2 className="mr-1 h-4 w-4" /> Save preferences
        </Button>
      </div>
    </div>
  );
}
