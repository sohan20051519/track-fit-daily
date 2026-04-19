import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <ProgressPage />
    </RequireAuth>
  ),
});

interface DayRow { date: string; label: string; calories: number; protein: number; volume: number; workouts: number }

function ProgressPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DayRow[]>([]);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = subDays(new Date(), 13);
      const startStr = format(start, "yyyy-MM-dd");
      const [{ data: meals }, { data: workouts }, { data: sets }] = await Promise.all([
        supabase.from("meals").select("date, calories, protein_g").gte("date", startStr),
        supabase.from("workouts").select("id, date").gte("date", startStr),
        supabase.from("workout_sets").select("reps, weight_kg, workout_id").gte("created_at", `${startStr}T00:00:00`),
      ]);
      const setsByWorkout = new Map<string, { reps: number; kg: number }[]>();
      (sets ?? []).forEach((s: any) => {
        const arr = setsByWorkout.get(s.workout_id) ?? [];
        arr.push({ reps: s.reps, kg: Number(s.weight_kg) });
        setsByWorkout.set(s.workout_id, arr);
      });
      const workoutsByDate = new Map<string, string[]>();
      (workouts ?? []).forEach((w: any) => {
        const arr = workoutsByDate.get(w.date) ?? [];
        arr.push(w.id);
        workoutsByDate.set(w.date, arr);
      });

      const days = eachDayOfInterval({ start, end: new Date() });
      const rows: DayRow[] = days.map((d) => {
        const k = format(d, "yyyy-MM-dd");
        const dayMeals = (meals ?? []).filter((m: any) => m.date === k);
        const wIds = workoutsByDate.get(k) ?? [];
        let volume = 0;
        wIds.forEach((id) => {
          (setsByWorkout.get(id) ?? []).forEach((s) => { volume += s.reps * s.kg; });
        });
        return {
          date: k,
          label: format(d, "MMM d"),
          calories: dayMeals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0),
          protein: Math.round(dayMeals.reduce((s: number, m: any) => s + Number(m.protein_g ?? 0), 0)),
          volume: Math.round(volume),
          workouts: wIds.length,
        };
      });
      setData(rows);
      setActiveDays(rows.filter((r) => r.workouts > 0 || r.calories > 0).length);
    })();
  }, [user]);

  const totalVolume = data.reduce((s, d) => s + d.volume, 0);
  const avgCal = data.length ? Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length) : 0;
  const avgPro = data.length ? Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last 14 days at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Active days" value={`${activeDays} / 14`} />
        <MiniStat label="Total volume" value={`${totalVolume.toLocaleString()} kg`} />
        <MiniStat label="Avg calories" value={`${avgCal}`} />
        <MiniStat label="Avg protein" value={`${avgPro}g`} />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Training volume (kg lifted)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.005 260)" }} />
              <Bar dataKey="volume" fill="oklch(0.62 0.19 25)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Calories</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
                <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.005 260)" }} />
                <Line type="monotone" dataKey="calories" stroke="oklch(0.62 0.19 25)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Protein (g)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
                <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.005 260)" }} />
                <Line type="monotone" dataKey="protein" stroke="oklch(0.72 0.16 160)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}
