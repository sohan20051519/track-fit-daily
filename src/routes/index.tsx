import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { ProgressRing } from "@/components/ProgressRing";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Beef, Dumbbell, ArrowUpRight, Scale, Sparkles, TrendingUp, Plus, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <Today />
    </RequireAuth>
  ),
});

interface Profile { display_name: string | null; daily_calorie_goal: number; daily_protein_goal: number }

function Today() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [todayVolume, setTodayVolume] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = format(subDays(new Date(), 27), "yyyy-MM-dd");
      const [{ data: p }, { data: meals }, { data: workouts }, { data: w }, { data: m }, { data: tw }, { data: sets }] = await Promise.all([
        supabase.from("profiles").select("display_name, daily_calorie_goal, daily_protein_goal").eq("id", user.id).maybeSingle(),
        supabase.from("meals").select("calories, protein_g").eq("date", today),
        supabase.from("workouts").select("id").eq("date", today),
        supabase.from("workouts").select("date").gte("date", since),
        supabase.from("meals").select("date").gte("date", since),
        supabase.from("weight_logs").select("weight_kg").eq("date", today).maybeSingle(),
        supabase.from("workout_sets").select("reps, weight_kg, workouts!inner(date)").eq("workouts.date", today),
      ]);
      setProfile(p);
      setCalories((meals ?? []).reduce((s, x) => s + (x.calories ?? 0), 0));
      setProtein((meals ?? []).reduce((s, x) => s + Number(x.protein_g ?? 0), 0));
      setExerciseCount((workouts ?? []).length);
      setTodayWeight(tw ? Number(tw.weight_kg) : null);
      const set = new Set<string>([...(w ?? []).map((x) => x.date), ...(m ?? []).map((x) => x.date)]);
      setActive(set);
      let s = 0;
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        if (set.has(d)) s++;
        else if (i > 0) break;
      }
      setStreak(s);
      const vol = (sets ?? []).reduce((acc: number, x: any) => acc + (x.reps ?? 0) * Number(x.weight_kg ?? 0), 0);
      setTodayVolume(Math.round(vol));
    })();
  }, [user, today]);

  const calGoal = profile?.daily_calorie_goal ?? 2200;
  const proGoal = profile?.daily_protein_goal ?? 150;
  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const days = eachDayOfInterval({ start: subDays(new Date(), 27), end: new Date() });
  const calPct = Math.min(100, Math.round((calories / calGoal) * 100));
  const proPct = Math.min(100, Math.round((protein / proGoal) * 100));

  return (
    <div className="space-y-3 animate-fade-in-up sm:space-y-4">
      {/* Hero */}
      <section className="rounded-3xl glass p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{format(new Date(), "EEEE · MMMM d")}</p>
            <h1 className="mt-1 font-serif-display text-[2rem] leading-[1.05] sm:text-4xl">
              {greeting}, <span className="italic opacity-90">{name}.</span>
            </h1>
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
              <Sparkles className="h-3 w-3 text-primary" />
              {streak > 0 ? `${streak}-day streak` : "Start your streak"}
            </div>
          </div>
          {todayWeight != null && (
            <div className="shrink-0 rounded-2xl glass-tint px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                <Scale className="h-3 w-3" /> Today
              </div>
              <div className="mt-0.5 font-mono text-base font-semibold">{todayWeight}<span className="text-[10px] text-muted-foreground"> kg</span></div>
            </div>
          )}
        </div>
      </section>

      {/* Bento — stable on mobile, expands on desktop */}
      <section className="grid grid-cols-6 gap-2.5 sm:gap-3 lg:grid-cols-12">
        {/* Hero ring tile — calories */}
        <Tile className="col-span-6 row-span-2 lg:col-span-5">
          <Link to="/nutrition" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <Label icon={<Flame className="h-3 w-3" />} color="var(--color-energy)">Calories</Label>
              <Arrow />
            </div>
            <div className="mt-3 flex flex-1 items-center justify-center gap-5 sm:mt-4">
              <ProgressRing value={calories} max={calGoal} size={132} stroke={11} color="var(--color-energy)">
                <div className="font-mono text-2xl font-semibold leading-none tabular-nums">{calories}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">/ {calGoal}</div>
              </ProgressRing>
              <div className="hidden flex-col gap-2 sm:flex">
                <Stat big label="Logged" value={`${calPct}%`} />
                <Stat label="Left" value={`${Math.max(0, calGoal - calories)}`} unit="kcal" />
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">
              {Math.max(0, calGoal - calories)} kcal left
            </div>
          </Link>
        </Tile>

        {/* Protein tile */}
        <Tile className="col-span-3 lg:col-span-4">
          <Link to="/nutrition" className="flex h-full flex-col">
            <Label icon={<Beef className="h-3 w-3" />} color="var(--color-vital)">Protein</Label>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <div className="font-mono text-3xl font-semibold leading-none tabular-nums">{Math.round(protein)}<span className="text-sm text-muted-foreground">g</span></div>
                <div className="mt-1 text-[10px] text-muted-foreground">/ {proGoal}g</div>
              </div>
              <div className="font-mono text-[11px] font-semibold text-vital">{proPct}%</div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-vital transition-all" style={{ width: `${proPct}%` }} />
            </div>
          </Link>
        </Tile>

        {/* Streak tile */}
        <Tile className="col-span-3 lg:col-span-3">
          <Label icon={<Sparkles className="h-3 w-3" />} color="var(--color-primary)">Streak</Label>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-4xl font-semibold leading-none tabular-nums">{streak}</span>
            <span className="text-[11px] text-muted-foreground">day{streak === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">{streak > 0 ? "🔥 keep going" : "log to start"}</div>
        </Tile>

        {/* Workouts tile */}
        <Tile className="col-span-3 lg:col-span-4 group">
          <Link to="/workouts" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <Label icon={<Dumbbell className="h-3 w-3" />} color="var(--color-strength)">Train</Label>
              <Arrow />
            </div>
            <div className="mt-2 font-mono text-3xl font-semibold leading-none tabular-nums">{exerciseCount}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {todayVolume > 0 ? `${(todayVolume / 1000).toFixed(1)}k kg volume` : "tap to log"}
            </div>
          </Link>
        </Tile>

        {/* Plan tile */}
        <Tile className="col-span-3 lg:col-span-3" tone="dark">
          <Link to="/workouts" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <Label muted icon={<CalendarDays className="h-3 w-3" />}>Plan</Link>
              </div>
            </Link>
        </Tile>
      </section>
    </div>
  );
}
