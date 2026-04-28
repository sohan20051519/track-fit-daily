import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, subDays, eachDayOfInterval, startOfWeek, startOfMonth, startOfYear, addWeeks, addMonths, addYears, differenceInDays } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, Area, AreaChart } from "recharts";
import { TrendingUp, Calendar, Scale, Flame, Beef, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <ProgressPage />
    </RequireAuth>
  ),
});

type Range = "daily" | "weekly" | "monthly" | "yearly";

interface Bucket { key: string; label: string; calories: number; protein: number; volume: number; workouts: number; weight: number | null }

interface RawDay { date: string; calories: number; protein: number; volume: number; workouts: number; weight: number | null }

function ProgressPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("daily");
  const [raw, setRaw] = useState<RawDay[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // window length in days for fetching
  const windowDays = range === "daily" ? 14 : range === "weekly" ? 12 * 7 : range === "monthly" ? 12 * 31 : 365 * 3;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = subDays(new Date(), windowDays - 1);
      const startStr = format(start, "yyyy-MM-dd");
      const [{ data: meals }, { data: workouts }, { data: sets }, { data: weights }] = await Promise.all([
        supabase.from("meals").select("date, calories, protein_g").gte("date", startStr),
        supabase.from("workouts").select("id, date").gte("date", startStr),
        supabase.from("workout_sets").select("reps, weight_kg, workout_id").gte("created_at", `${startStr}T00:00:00`),
        supabase.from("weight_logs").select("date, weight_kg").gte("date", startStr).order("date"),
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
      const rows: RawDay[] = days.map((d) => {
        const k = format(d, "yyyy-MM-dd");
        const dayMeals = (meals ?? []).filter((m: any) => m.date === k);
        const wIds = workoutsByDate.get(k) ?? [];
        let volume = 0;
        wIds.forEach((id) => {
          (setsByWorkout.get(id) ?? []).forEach((s) => { volume += s.reps * s.kg; });
        });
        return {
          date: k,
          calories: dayMeals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0),
          protein: Math.round(dayMeals.reduce((s: number, m: any) => s + Number(m.protein_g ?? 0), 0)),
          volume: Math.round(volume),
          workouts: wIds.length,
          weight: weightByDate.get(k) ?? null,
        };
      });
      setRaw(rows);
      const wList = (weights ?? []) as { date: string; weight_kg: number }[];
      setLatestWeight(wList.length ? Number(wList[wList.length - 1].weight_kg) : null);
    })();
  }, [user, windowDays]);

  // Aggregate raw days into buckets per range
  const buckets = useMemo<Bucket[]>(() => {
    if (!raw.length) return [];
    if (range === "daily") {
      // last 14 days
      const slice = raw.slice(-14);
      return slice.map((r) => ({
        key: r.date,
        label: format(new Date(r.date), "MMM d"),
        calories: r.calories,
        protein: r.protein,
        volume: r.volume,
        workouts: r.workouts,
        weight: r.weight,
      }));
    }
    const buckMap = new Map<string, RawDay[]>();
    raw.forEach((r) => {
      const d = new Date(r.date);
      let bk: string;
      if (range === "weekly") bk = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      else if (range === "monthly") bk = format(startOfMonth(d), "yyyy-MM");
      else bk = format(startOfYear(d), "yyyy");
      const arr = buckMap.get(bk) ?? [];
      arr.push(r);
      buckMap.set(bk, arr);
    });
    const sortedKeys = Array.from(buckMap.keys()).sort();
    return sortedKeys.map((k) => {
      const arr = buckMap.get(k)!;
      const totalCal = arr.reduce((s, x) => s + x.calories, 0);
      const totalPro = arr.reduce((s, x) => s + x.protein, 0);
      const days = arr.length;
      const weightVals = arr.map((a) => a.weight).filter((w): w is number => w != null);
      const avgWeight = weightVals.length ? weightVals.reduce((a, b) => a + b, 0) / weightVals.length : null;
      const label = range === "weekly" ? format(new Date(k), "MMM d")
        : range === "monthly" ? format(new Date(k + "-01"), "MMM yy")
        : k;
      return {
        key: k,
        label,
        calories: Math.round(totalCal / days),
        protein: Math.round(totalPro / days),
        volume: Math.round(arr.reduce((s, x) => s + x.volume, 0)),
        workouts: arr.reduce((s, x) => s + x.workouts, 0),
        weight: avgWeight != null ? Math.round(avgWeight * 10) / 10 : null,
      };
    });
  }, [raw, range]);

  const data = buckets;
  const totalVolume = data.reduce((s, d) => s + d.volume, 0);
  const avgCal = data.length ? Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length) : 0;
  const avgPro = data.length ? Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length) : 0;
  const activeBuckets = data.filter((d) => d.workouts > 0 || d.calories > 0).length;
  const weightSeries = data.filter((d) => d.weight != null);
  const firstW = weightSeries[0]?.weight;
  const lastW = weightSeries[weightSeries.length - 1]?.weight;
  const weightDelta = firstW != null && lastW != null && weightSeries.length > 1 ? Math.round((lastW - firstW) * 10) / 10 : null;
  const periodLabel = range === "daily" ? "days" : range === "weekly" ? "weeks" : range === "monthly" ? "months" : "years";

  return (
    <div className="space-y-4 stagger sm:space-y-5">
      {/* Header */}
      <div className="rounded-3xl glass p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{data.length} {periodLabel}</p>
        <h1 className="mt-1 font-serif-display text-4xl leading-none sm:text-5xl">Progress</h1>
      </div>

      {/* Range tabs */}
      <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
        <TabsList className="grid w-full grid-cols-4 rounded-full bg-muted p-1">
          <TabsTrigger value="daily" className="rounded-full text-xs">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-full text-xs">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-full text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="yearly" className="rounded-full text-xs">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stat bento */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile icon={<Calendar className="h-3.5 w-3.5" />} label={`Active ${periodLabel}`} value={`${activeBuckets}`} hint={`/ ${data.length}`} color="var(--color-primary)" />
        <StatTile
          icon={<Scale className="h-3.5 w-3.5" />}
          label="Weight"
          value={latestWeight != null ? `${latestWeight}` : "—"}
          unit={latestWeight != null ? "kg" : ""}
          hint={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta}kg` : undefined}
          color="var(--color-focus)"
        />
        <StatTile icon={<Flame className="h-3.5 w-3.5" />} label="Avg cal" value={`${avgCal}`} unit="kcal" color="var(--color-energy)" />
        <StatTile icon={<Beef className="h-3.5 w-3.5" />} label="Avg protein" value={`${avgPro}`} unit="g" color="var(--color-vital)" />
      </section>

      {/* Weight trend */}
      {weightSeries.length > 0 && (
        <ChartCard title="Bodyweight" subtitle="kg" icon={<Scale className="h-3.5 w-3.5" />} color="var(--color-focus)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightSeries} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="g-weight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.16 250)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.68 0.16 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 260 / 0.15)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
              <Area type="monotone" dataKey="weight" stroke="oklch(0.68 0.16 250)" strokeWidth={2.5} fill="url(#g-weight)" dot={{ r: 3, fill: "oklch(0.68 0.16 250)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Volume */}
      <ChartCard title="Training volume" subtitle={`${totalVolume.toLocaleString()} kg total`} icon={<Dumbbell className="h-3.5 w-3.5" />} color="var(--color-strength)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="g-vol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.2 27)" stopOpacity={1} />
                <stop offset="100%" stopColor="oklch(0.74 0.18 50)" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 260 / 0.15)" vertical={false} />
            <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "oklch(0 0 0 / 0.04)" }} contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
            <Bar dataKey="volume" fill="url(#g-vol)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cal + Protein */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <ChartCard title="Calories" subtitle={`avg ${avgCal} kcal`} icon={<Flame className="h-3.5 w-3.5" />} color="var(--color-energy)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 260 / 0.15)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
              <Line type="monotone" dataKey="calories" stroke="oklch(0.72 0.18 45)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.18 45)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Protein" subtitle={`avg ${avgPro}g`} icon={<Beef className="h-3.5 w-3.5" />} color="var(--color-vital)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.02 260 / 0.15)" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.5 0.02 260)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-card)", fontSize: 12 }} />
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
    <div className={cn("rounded-3xl glass p-4 transition-all hover:-translate-y-0.5")}>
      <div className="flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color }}
        >
          {icon}
        </span>
        {hint && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            <TrendingUp className="h-2.5 w-2.5" />
            {hint}
          </span>
        )}
      </div>
      <div className="mt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}{unit && <span className="text-sm text-muted-foreground"> {unit}</span>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, color, children }: { title: string; subtitle?: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl glass p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color }}
          >
            {icon}
          </span>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {subtitle && <span className="font-mono text-[10px] text-muted-foreground">{subtitle}</span>}
      </div>
      <div className="h-48 sm:h-60">{children}</div>
    </div>
  );
}
