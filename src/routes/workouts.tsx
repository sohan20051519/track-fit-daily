import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BODY_PARTS, EXERCISES_BY_PART } from "@/lib/constants";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

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

function WorkoutsPage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [bodyPart, setBodyPart] = useState<string>("Chest");
  const [exercise, setExercise] = useState<string>(EXERCISES_BY_PART["Chest"][0]);
  const [sets, setSets] = useState<SetRow[]>([{ reps: "10", kg: "20" }]);
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setExercise(EXERCISES_BY_PART[bodyPart][0]);
  }, [bodyPart]);

  const addSet = () => setSets((s) => [...s, { reps: "10", kg: "20" }]);
  const removeSet = (i: number) => setSets((s) => s.filter((_, idx) => idx !== i));
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
    if (error || !w) {
      toast.error(error?.message ?? "Failed");
      setBusy(false);
      return;
    }
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
      toast.success("Workout logged");
      setSets([{ reps: "10", kg: "20" }]);
      load();
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    await supabase.from("workouts").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log today's training, set by set.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">New exercise</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Body part</Label>
            <Select value={bodyPart} onValueChange={setBodyPart}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BODY_PARTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Select value={exercise} onValueChange={setExercise}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXERCISES_BY_PART[bodyPart].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label>Sets</Label>
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground">#{i + 1}</span>
                <Input type="number" inputMode="numeric" placeholder="Reps" value={s.reps} onChange={(e) => updateSet(i, "reps", e.target.value)} />
                <span className="text-sm text-muted-foreground">×</span>
                <Input type="number" inputMode="decimal" placeholder="Kg" value={s.kg} onChange={(e) => updateSet(i, "kg", e.target.value)} />
                <span className="text-sm text-muted-foreground">kg</span>
                {sets.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeSet(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addSet} className="mt-2">
            <Plus className="mr-1 h-4 w-4" /> Add set
          </Button>
        </div>

        <Button className="mt-6 w-full sm:w-auto" disabled={busy} onClick={save}>
          Save exercise
        </Button>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Today</h2>
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No exercises logged today.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <Card key={it.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.body_part}</div>
                    <h3 className="mt-0.5 text-lg font-semibold">{it.exercise_name}</h3>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del(it.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.sets.map((s) => (
                    <span key={s.id} className="rounded-full bg-secondary px-3 py-1 text-sm">
                      {s.reps} × {Number(s.weight_kg)}kg
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
