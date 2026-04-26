import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BODY_PARTS, EXERCISES_BY_PART } from "@/lib/constants";
import { Plus, Minus, Trash2, Dumbbell, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <WorkoutsPage />
    </RequireAuth>
  ),
});

interface SetRow { reps: string; kg: string }
interface WorkoutItem {
  id: string;
  body_part: string;
  exercise_name: string;
  sets: { id: string; set_number: number; reps: number; weight_kg: number }[];
}

function makeSets(count: number, base?: SetRow): SetRow[] {
  const b = base ?? { reps: "10", kg: "20" };
  return Array.from({ length: count }, () => ({ ...b }));
}

function WorkoutsPage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [bodyPart, setBodyPart] = useState<string>("Chest");
  const [exercise, setExercise] = useState<string>(EXERCISES_BY_PART["Chest"][0]);
  const [setCount, setSetCount] = useState(3);
  const [sets, setSets] = useState<SetRow[]>(makeSets(3));
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: ws } = await supabase
      .from("workouts")
      .select("id, body_part, exercise_name, workout_sets(id, set_number, reps, weight_kg)")
      .eq("date", today)
      .order("created_at", { ascending: false });
    const mapped: WorkoutItem[] = (ws ?? []).map((w: any) => ({
      id: w.id,
      body_part: w.body_part,
      exercise_name: w.exercise_name,
      sets: (w.workout_sets ?? []).sort((a: any, b: any) => a.set_number - b.set_number),
    }));
    setItems(mapped);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { setExercise(EXERCISES_BY_PART[bodyPart][0]); }, [bodyPart]);
  useEffect(() => {
    setSets((prev) => {
      if (setCount === prev.length) return prev;
      if (setCount > prev.length) {
        const last = prev[prev.length - 1] ?? { reps: "10", kg: "20" };
        return [...prev, ...Array.from({ length: setCount - prev.length }, () => ({ ...last }))];
      }
      return prev.slice(0, setCount);
    });
  }, [setCount]);

  const updateSet = (i: number, key: keyof SetRow, val: string) =>
    setSets((s) => s.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { data: w, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, date: today, body_part: bodyPart, exercise_name: exercise })
      .select("id")
      .single();
    if (error || !w) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    const rows = sets.map((s, i) => ({
      workout_id: w.id,
      user_id: user.id,
      set_number: i + 1,
      reps: parseInt(s.reps) || 0,
      weight_kg: parseFloat(s.kg) || 0,
    }));
    const { error: e2 } = await supabase.from("workout_sets").insert(rows);
    if (e2) toast.error(e2.message);
    else {
      toast.success("Exercise logged");
      setSetCount(3);
      setSets(makeSets(3));
      load();
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    await supabase.from("workouts").delete().eq("id", id);
    load();
  };

  const totalVolume = items.reduce((s, it) => s + it.sets.reduce((a, x) => a + x.reps * Number(x.weight_kg), 0), 0);
  const totalSets = items.reduce((s, it) => s + it.sets.length, 0);

  return (
    <div className="space-y-4 stagger sm:space-y-5">
      {/* Header bento */}
      <section className="grid grid-cols-6 gap-2.5 sm:gap-3">
        <div className="col-span-6 rounded-3xl glass specular p-4 sm:col-span-3 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{format(new Date(), "EEEE")}</p>
          <h1 className="mt-1 font-serif-display text-4xl leading-none sm:text-5xl">Workouts</h1>
        </div>
        <MiniMetric className="col-span-2 sm:col-span-1" label="Sets" value={totalSets} />
        <MiniMetric className="col-span-2 sm:col-span-1" label="Lifts" value={items.length} />
        <MiniMetric className="col-span-2 sm:col-span-1" label="Volume" value={`${(totalVolume / 1000).toFixed(1)}k`} unit="kg" />
      </section>

      {/* Logger card */}
      <div className="rounded-3xl glass specular p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <h2 className="text-base font-semibold tracking-tight">New exercise</h2>
        </div>

        {/* Body part pills */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Body part</Label>
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {BODY_PARTS.map((b) => (
              <button
                key={b}
                onClick={() => setBodyPart(b)}
                className={cn(
                  "pressable rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  bodyPart === b
                    ? "border-foreground bg-foreground text-background shadow-soft"
                    : "border-white/50 bg-white/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Exercise</Label>
          <Select value={exercise} onValueChange={setExercise}>
            <SelectTrigger className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXERCISES_BY_PART[bodyPart].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stepper */}
        <div className="mt-4 flex items-center justify-between rounded-2xl glass-tint p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total sets</div>
            <div className="mt-0.5 font-mono text-2xl font-semibold tabular-nums">{setCount}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="outline" className="h-10 w-10 rounded-full border-white/50 bg-white/60" onClick={() => setSetCount((c) => Math.max(1, c - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" className="h-10 w-10 rounded-full" onClick={() => setSetCount((c) => Math.min(20, c + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sets editor */}
        <div className="mt-4 space-y-1.5">
          <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 px-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Set</span><span>Reps</span><span>Weight (kg)</span>
          </div>
          <div className="space-y-1.5">
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 rounded-2xl glass-tint p-1.5">
                <span className="ml-1.5 font-mono text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <Input type="number" inputMode="numeric" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} className="no-spin h-10 rounded-xl border-transparent bg-white/70 font-mono text-base" />
                <Input type="number" inputMode="decimal" value={s.kg} onChange={(e) => updateSet(i, "kg", e.target.value)} className="no-spin h-10 rounded-xl border-transparent bg-white/70 font-mono text-base" />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={busy} className="mt-4 h-12 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card">
          <CheckCircle2 className="mr-1 h-4 w-4" /> Save exercise
        </Button>
      </div>

      {/* Today's list */}
      <div>
        <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Today's session</h2>
        {items.length === 0 ? (
          <div className="rounded-3xl glass-tint specular p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-muted-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No exercises logged yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 stagger sm:grid-cols-2">
            {items.map((it) => {
              const vol = it.sets.reduce((a, s) => a + s.reps * Number(s.weight_kg), 0);
              return (
                <div key={it.id} className="rounded-3xl glass specular p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">{it.body_part}</div>
                      <h3 className="mt-0.5 truncate text-base font-semibold tracking-tight">{it.exercise_name}</h3>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {it.sets.length} sets · {Math.round(vol).toLocaleString()} kg
                      </div>
                    </div>
                    <button onClick={() => del(it.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {it.sets.map((s) => (
                      <span key={s.id} className="rounded-full bg-white/60 px-2.5 py-1 font-mono text-[11px]">
                        {s.reps} × {Number(s.weight_kg)}kg
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value, unit, className }: { label: string; value: string | number; unit?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl glass specular p-3 text-center", className)}>
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-semibold leading-tight tabular-nums">{value}{unit && <span className="text-[10px] text-muted-foreground"> {unit}</span>}</div>
    </div>
  );
}
