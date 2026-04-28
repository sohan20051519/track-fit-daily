import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WEEKDAYS, todayWeekday } from "@/lib/weekdays";
import { BODY_PARTS, EXERCISES_BY_PART } from "@/lib/constants";
import { exerciseImage } from "@/lib/exerciseImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, CalendarDays, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface PlanItem {
  id: string;
  weekday: number;
  position: number;
  body_part: string;
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
}

export function WeeklyWorkoutPlan({ onLogged }: { onLogged?: () => void }) {
  const { user } = useAuth();
  const [day, setDay] = useState<number>(todayWeekday());
  const [items, setItems] = useState<PlanItem[]>([]);
  const [bodyPart, setBodyPart] = useState<string>("Chest");
  const [exercise, setExercise] = useState<string>(EXERCISES_BY_PART["Chest"][0]);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [kg, setKg] = useState("20");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_plan_items")
      .select("*")
      .order("weekday")
      .order("position");
    setItems((data ?? []) as PlanItem[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { setExercise(EXERCISES_BY_PART[bodyPart][0]); }, [bodyPart]);

  const dayItems = useMemo(() => items.filter((i) => i.weekday === day), [items, day]);

  const add = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("workout_plan_items").insert({
      user_id: user.id,
      weekday: day,
      position: dayItems.length,
      body_part: bodyPart,
      exercise_name: exercise,
      target_sets: parseInt(sets) || 3,
      target_reps: parseInt(reps) || 10,
      target_weight_kg: parseFloat(kg) || 20,
    });
    if (error) toast.error(error.message);
    else { toast.success("Added to plan"); load(); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    await supabase.from("workout_plan_items").delete().eq("id", id);
    load();
  };

  const logToToday = async (it: PlanItem) => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: w, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, date: today, body_part: it.body_part, exercise_name: it.exercise_name })
      .select("id")
      .single();
    if (error || !w) { toast.error(error?.message ?? "Failed"); return; }
    const rows = Array.from({ length: it.target_sets }, (_, i) => ({
      workout_id: w.id, user_id: user.id, set_number: i + 1, reps: it.target_reps, weight_kg: Number(it.target_weight_kg),
    }));
    const { error: e2 } = await supabase.from("workout_sets").insert(rows);
    if (e2) toast.error(e2.message);
    else { toast.success(`Logged ${it.exercise_name}`); onLogged?.(); }
  };

  const logAllForToday = async () => {
    const td = todayWeekday();
    const todays = items.filter((i) => i.weekday === td);
    if (!todays.length) { toast.error("No exercises planned for today"); return; }
    for (const it of todays) await logToToday(it);
  };

  return (
    <div className="space-y-4">
      {/* Day picker */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-focus text-primary-foreground shadow-soft">
            <CalendarDays className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">Weekly plan</h2>
        </div>
        <Button onClick={logAllForToday} size="sm" className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Play className="mr-1 h-3 w-3" /> Run today
        </Button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {WEEKDAYS.map((w) => {
          const isToday = w.idx === todayWeekday();
          const count = items.filter((i) => i.weekday === w.idx).length;
          return (
            <button
              key={w.idx}
              onClick={() => setDay(w.idx)}
              className={cn(
                "pressable relative flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-2 py-2 text-[11px] font-medium transition-all",
                day === w.idx
                  ? "border-foreground bg-foreground text-background shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{w.short}</span>
              <span className={cn("mt-0.5 font-mono text-[9px]", day === w.idx ? "text-background/70" : "text-muted-foreground")}>{count}</span>
              {isToday && <span className={cn("absolute right-1 top-1 h-1.5 w-1.5 rounded-full", day === w.idx ? "bg-background" : "bg-primary")} />}
            </button>
          );
        })}
      </div>

      {/* Add exercise to plan */}
      <div className="rounded-2xl glass-tint p-3 space-y-3">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Add to {WEEKDAYS.find((w) => w.idx === day)?.long}</Label>
        <div className="flex flex-wrap gap-1.5">
          {BODY_PARTS.map((b) => (
            <button
              key={b}
              onClick={() => setBodyPart(b)}
              className={cn(
                "pressable rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                bodyPart === b ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground",
              )}
            >{b}</button>
          ))}
        </div>
        <Select value={exercise} onValueChange={setExercise}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXERCISES_BY_PART[bodyPart].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Sets" value={sets} onChange={setSets} />
          <NumField label="Reps" value={reps} onChange={setReps} />
          <NumField label="kg" value={kg} onChange={setKg} />
        </div>
        <Button onClick={add} disabled={busy} className="h-11 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
          <Plus className="mr-1 h-4 w-4" /> Add to plan
        </Button>
      </div>

      {/* Plan list */}
      <div className="space-y-2">
        {dayItems.length === 0 ? (
          <div className="rounded-2xl glass-tint p-6 text-center">
            <Dumbbell className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">Rest day — or add an exercise above.</p>
          </div>
        ) : dayItems.map((it) => {
          const img = exerciseImage(it.exercise_name);
          return (
            <div key={it.id} className="flex items-center gap-3 rounded-2xl glass p-2.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {img ? <img src={img} alt={it.exercise_name} loading="lazy" className="h-full w-full object-cover" /> : <Dumbbell className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-primary">{it.body_part}</div>
                <div className="truncate text-sm font-semibold">{it.exercise_name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{it.target_sets}×{it.target_reps} · {Number(it.target_weight_kg)}kg</div>
              </div>
              <button onClick={() => logToToday(it)} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-foreground px-3 text-[11px] font-medium text-background hover:bg-foreground/90">
                <Play className="h-3 w-3" /> Log
              </button>
              <button onClick={() => remove(it.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="no-spin h-10 rounded-xl text-center font-mono" />
    </div>
  );
}
