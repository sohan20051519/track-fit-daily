import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, Area, AreaChart } from "recharts";
import { TrendingUp, Calendar, Scale, Flame, Beef, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <ProgressPage />
    </RequireAuth>
  ),
});

interface DayRow { date: string; label: string; calories: number; protein: number; volume: number; workouts: number; weight: number | null }

function ProgressPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DayRow[]>([]);
  const [activeDays, setActiveDays] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [weightDelta, setWeightDelta] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = subDays(new Date(), 13);
      const startStr = format(start, "yyyy-MM-dd");
      const [{ data: meals }, { data: workouts }, { data: sets }, { data: weights }] = await Promise.all([
        supabase.from("meals").select("date, calories, protein_g").gte("date", startStr),
        supabase.from("workouts").select("id, date").gte("date", startStr),
        supabase.from("workout_sets").select("reps, weight_kg, workout_id").gte("created_at", `${startStr}T00:00:00`),
        supabase.from("weight_logs").select("date, weight_kg").gte("date", format(subDays(new Date(), 89), "yyyy-MM-dd")).order("date"),
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
      const weightByDate = new Map<string, number>();
      (weights ?? []).forEach((w: any) => weightByDate.set(w.date, Number(w.weight_kg)));

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
          weight: weightByDate.get(k) ?? null,
        };
      });
      setData(rows);
      setActiveDays(rows.filter((r) => r.workouts > 0 || r.calories > 0).length);
      const allWeights = (weights ?? []) as { date: string; weight_kg: number }[];
      if (allWeights.length) {
        const last = Number(allWeights[allWeights.length - 1].weight_kg);
        setLatestWeight(last);
        const first = Number(allWeights[0].weight_kg);
        setWeightDelta(allWeights.length > 1 ? Math.round((last - first) * 10) / 10 : null);
      }
    })();
  }, [user]);

  const totalVolume = data.reduce((s, d) => s + d.volume, 0);
  const avgCal = data.length ? Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length) : 0;
  const avgPro = data.length ? Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length) : 0;
  const weightSeries = data.filter((d) => d.weight != null);

  return (
    <div className="space-y-6 stagger">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Last 14 days</p>
        <h1 className="mt-1 font-serif-display text-4xl sm:text-5xl">Progress</h1>
      </div>

      {/* Stat bento */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<Calendar className="h-4 w-4" />} label="Active days" value={`${activeDays}`} hint="/ 14" color="var(--color-primary)" />
        <StatTile
          icon={<Scale className="h-4 w-4" />}
          label="Latest weight"
          value={latestWeight != null ? `${latestWeight}` : "—"}
          unit={latestWeight != null ? "kg" : ""}
          hint={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta}kg` : undefined}
          color="var(--color-focus)"
        />
        <StatTile icon={<Flame className="h-4 w-4" />} label="Avg calories" value={`${avgCal}`} unit="kcal" color="var(--color-energy)" />
        <StatTile icon={<Beef className="h-4 w-4" />} label="Avg protein" value={`${avgPro}`} unit="g" color="var(--color-vital)" />
      </section>

      {/* Weight trend */}
      {weightSeries.length > 0 && (
        <ChartCard title="Bodyweight" subtitle="kg" icon={<Scale className="h-4 w-4" />} color="var(--color-focus)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightSeries} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="g-weight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.16 250)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="oklch(0.68 0.16 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 80)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid oklch(0.92 0.005 80)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
              <Area type="monotone" dataKey="weight" stroke="oklch(0.68 0.16 250)" strokeWidth={2.5} fill="url(#g-weight)" dot={{ r: 3, fill: "oklch(0.68 0.16 250)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Volume */}
      <ChartCard
        title="Training volume"
        subtitle={`${totalVolume.toLocaleString()} kg total`}
        icon={<Dumbbell className="h-4 w-4" />}
        color="var(--color-strength)"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="g-vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.2 27)" stopOpacity={1} />
                <stop offset="100%" stopColor="oklch(0.74 0.18 50)" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 80)" vertical={false} />
            <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "oklch(0.96 0.008 80)" }} contentStyle={{ borderRadius: 16, border: "1px solid oklch(0.92 0.005 80)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
            <Bar dataKey="volume" fill="url(#g-vol)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cal + Protein side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Calories" subtitle={`avg ${avgCal} kcal`} icon={<Flame className="h-4 w-4" />} color="var(--color-energy)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 80)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid oklch(0.92 0.005 80)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
              <Line type="monotone" dataKey="calories" stroke="oklch(0.72 0.18 45)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.18 45)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Protein" subtitle={`avg ${avgPro}g`} icon={<Beef className="h-4 w-4" />} color="var(--color-vital)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 80)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid oklch(0.92 0.005 80)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
              <Line type="monotone" dataKey="protein" stroke="oklch(0.74 0.14 165)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.74 0.14 165)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, unit, hint, color }: { icon: React.ReactNode; label: string; value: string; unit?: string; hint?: string; color: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center justify-between">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
        >
          {icon}
        </span>
        {hint && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {hint}
          </span>
        )}
      </div>
      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-3xl font-semibold tabular-nums">
        {value}{unit && <span className="text-base text-muted-foreground"> {unit}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, color, children }: { title: string; subtitle?: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
          >
            {icon}
          </span>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {subtitle && <span className="font-mono text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="h-56 sm:h-64">{children}</div>
    </div>
  );
}
