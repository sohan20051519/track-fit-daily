import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { ProgressRing } from "@/components/ProgressRing";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Beef, Dumbbell, ArrowUpRight, Scale, Sparkles, TrendingUp, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Today — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <Today />
    </RequireAuth>
  ),
});

interface Profile {
  display_name: string | null;
  daily_calorie_goal: number;
  daily_protein_goal: number;
}

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

  return (
    <div className="space-y-3 animate-fade-in-up sm:space-y-4">
      {/* Hero — liquid glass */}
      <section className="relative overflow-hidden rounded-[24px] glass p-4 sm:p-6">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
            <div className="flex items-center gap-2 rounded-2xl glass-tint px-3 py-2 sm:flex-col sm:items-end">
              <Scale className="h-4 w-4 text-focus" />
              <div className="sm:text-right">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Today</div>
                <div className="font-mono text-base font-semibold">{todayWeight} kg</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bento — true asymmetric grid that stays bento on mobile */}
      <section className="grid auto-rows-[minmax(0,auto)] grid-cols-6 gap-2.5 sm:gap-3 lg:grid-cols-12">
        {/* Calories ring – HERO TILE */}
        <BentoTile className="col-span-6 row-span-2 lg:col-span-5">
          <Link to="/nutrition" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <BentoLabel icon={<Flame className="h-3 w-3" />} color="var(--color-energy)">Calories</BentoLabel>
              <ArrowChip />
            </div>
            <div className="mt-3 flex flex-1 items-center justify-center py-2">
              <ProgressRing value={calories} max={calGoal} size={200} stroke={14} color="var(--color-energy)">
                <div className="font-mono text-[2.6rem] font-semibold leading-none tabular-nums">{calories}</div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">of {calGoal} kcal</div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">
                  {Math.max(0, calGoal - calories)} kcal left
                </div>
              </ProgressRing>
            </div>
          </Link>
        </BentoTile>

        {/* Protein – TALL TILE */}
        <BentoTile className="col-span-3 row-span-2 lg:col-span-3">
          <Link to="/nutrition" className="flex h-full flex-col">
            <BentoLabel icon={<Beef className="h-3 w-3" />} color="var(--color-vital)">Protein</BentoLabel>
            <div className="flex flex-1 items-center justify-center py-2">
              <ProgressRing value={protein} max={proGoal} size={110} stroke={11} color="var(--color-vital)">
                <div className="font-mono text-lg font-semibold leading-none tabular-nums">{Math.round(protein)}</div>
                <div className="text-[9px] text-muted-foreground">/ {proGoal}g</div>
              </ProgressRing>
            </div>
            <div className="text-[10px] text-muted-foreground">muscle fuel</div>
          </Link>
        </BentoTile>

        {/* Streak */}
        <BentoTile className="col-span-3 lg:col-span-2">
          <BentoLabel icon={<Sparkles className="h-3 w-3" />} color="var(--color-primary)">Streak</BentoLabel>
          <div className="mt-1 font-mono text-3xl font-semibold tabular-nums sm:text-4xl">{streak}</div>
          <div className="text-[10px] text-muted-foreground">day{streak === 1 ? "" : "s"} on fire</div>
        </BentoTile>

        {/* Workouts today */}
        <BentoTile className="col-span-3 lg:col-span-2 group">
          <Link to="/workouts" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <BentoLabel icon={<Dumbbell className="h-3 w-3" />} color="var(--color-strength)">Train</BentoLabel>
              <ArrowChip />
            </div>
            <div className="mt-1 font-mono text-3xl font-semibold tabular-nums sm:text-4xl">{exerciseCount}</div>
            <div className="text-[10px] text-muted-foreground">
              {todayVolume > 0 ? `${(todayVolume / 1000).toFixed(1)}k kg vol` : "tap to log"}
            </div>
          </Link>
        </BentoTile>

        {/* Quick add — wide accent tile */}
        <BentoTile className="col-span-6 lg:col-span-7" tone="dark">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <BentoLabel icon={<TrendingUp className="h-3 w-3" />} color="oklch(0.78 0.14 165)" muted>Progress</BentoLabel>
              <p className="mt-1 text-sm font-medium leading-snug opacity-90">Track weight, macros & volume over time.</p>
            </div>
            <Link to="/progress" className="shrink-0 rounded-full bg-white/15 px-3 py-2 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25">
              Open
            </Link>
          </div>
        </BentoTile>

        {/* Quick action chips */}
        <Link
          to="/workouts"
          className="col-span-3 flex items-center gap-2 rounded-2xl glass-tint specular px-3 py-3 text-sm font-medium pressable lg:col-span-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="min-w-0">
            <span className="block truncate">Log workout</span>
            <span className="block text-[10px] font-normal text-muted-foreground">add exercise</span>
          </span>
        </Link>
        <Link
          to="/nutrition"
          className="col-span-3 flex items-center gap-2 rounded-2xl glass-tint specular px-3 py-3 text-sm font-medium pressable lg:col-span-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-vital text-accent-foreground">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="min-w-0">
            <span className="block truncate">Log meal</span>
            <span className="block text-[10px] font-normal text-muted-foreground">add food</span>
          </span>
        </Link>

        {/* Consistency strip — full width */}
        <BentoTile className="col-span-6 lg:col-span-12">
          <div className="mb-2.5 flex items-baseline justify-between">
            <BentoLabel>Last 28 days</BentoLabel>
            <span className="font-mono text-[10px] text-muted-foreground">{active.size}/28 active</span>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}>
            {days.map((d, i) => {
              const k = format(d, "yyyy-MM-dd");
              const on = active.has(k);
              const isToday = i === days.length - 1;
              return (
                <div
                  key={k}
                  title={format(d, "MMM d")}
                  className={cn(
                    "aspect-square rounded-[5px] transition-all",
                    on ? "bg-gradient-primary shadow-soft" : "bg-foreground/[0.06]",
                    isToday && "ring-2 ring-foreground ring-offset-1 ring-offset-transparent",
                  )}
                />
              );
            })}
          </div>
        </BentoTile>
      </section>
    </div>
  );
}

function BentoTile({
  className,
  children,
  tone = "glass",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "glass" | "dark";
}) {
  return (
    <div
      className={cn(
        "specular relative overflow-hidden rounded-3xl p-4 transition-all hover:-translate-y-0.5 sm:p-5",
        tone === "glass" ? "glass" : "bg-foreground text-background border border-foreground/30 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ArrowChip() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
      <ArrowUpRight className="h-3.5 w-3.5" />
    </span>
  );
}

function BentoLabel({
  icon,
  color,
  children,
  muted,
}: {
  icon?: React.ReactNode;
  color?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]", muted ? "text-background/70" : "text-muted-foreground")}>
      {icon && (
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[5px]"
          style={color ? { background: `color-mix(in oklab, ${color} 22%, transparent)`, color } : undefined}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}
