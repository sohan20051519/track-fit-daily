import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { ProgressRing } from "@/components/ProgressRing";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Beef, Dumbbell, ArrowUpRight, Scale, Sparkles, TrendingUp } from "lucide-react";
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
    <div className="space-y-5 stagger">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-vital)" }} />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{format(new Date(), "EEEE · MMMM d")}</p>
            <h1 className="mt-2 font-serif-display text-4xl leading-[1.05] sm:text-5xl">
              {greeting},<br />
              <span className="italic opacity-90">{name}.</span>
            </h1>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {streak > 0 ? `${streak}-day streak — keep going` : "Start your streak today"}
            </div>
          </div>

          {todayWeight != null && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur sm:flex-col sm:items-end">
              <Scale className="h-5 w-5 text-focus" />
              <div className="sm:text-right">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
                <div className="font-mono text-xl font-semibold">{todayWeight} kg</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bento grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
        {/* Calories ring – BIG */}
        <BentoCard className="col-span-2 lg:col-span-5 lg:row-span-2">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div>
                <BentoLabel icon={<Flame className="h-3.5 w-3.5" />} color="var(--color-energy)">Calories</BentoLabel>
                <h3 className="mt-1 text-base font-medium">Daily energy</h3>
              </div>
              <Link to="/nutrition" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-foreground hover:text-background">
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-1 items-center justify-center">
              <ProgressRing value={calories} max={calGoal} size={220} stroke={16} color="var(--color-energy)">
                <div className="font-mono text-4xl font-semibold tabular-nums">{calories}</div>
                <div className="mt-1 text-xs text-muted-foreground">of {calGoal} kcal</div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                  {Math.max(0, calGoal - calories)} kcal left
                </div>
              </ProgressRing>
            </div>
          </div>
        </BentoCard>

        {/* Protein ring */}
        <BentoCard className="col-span-1 lg:col-span-4">
          <BentoLabel icon={<Beef className="h-3.5 w-3.5" />} color="var(--color-vital)">Protein</BentoLabel>
          <div className="mt-3 flex items-center gap-4">
            <ProgressRing value={protein} max={proGoal} size={88} stroke={9} color="var(--color-vital)">
              <div className="font-mono text-sm font-semibold tabular-nums">{Math.round(protein)}g</div>
            </ProgressRing>
            <div className="min-w-0">
              <div className="font-mono text-2xl font-semibold tabular-nums">{Math.round(protein)}<span className="text-base text-muted-foreground">/{proGoal}g</span></div>
              <div className="mt-1 text-xs text-muted-foreground">muscle fuel</div>
            </div>
          </div>
        </BentoCard>

        {/* Streak */}
        <BentoCard className="col-span-1 lg:col-span-3">
          <BentoLabel icon={<Sparkles className="h-3.5 w-3.5" />} color="var(--color-primary)">Streak</BentoLabel>
          <div className="mt-2 font-mono text-4xl font-semibold tabular-nums">{streak}</div>
          <div className="text-xs text-muted-foreground">day{streak === 1 ? "" : "s"} active</div>
        </BentoCard>

        {/* Workouts today */}
        <BentoCard className="col-span-1 lg:col-span-4 group cursor-default">
          <Link to="/workouts" className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              <BentoLabel icon={<Dumbbell className="h-3.5 w-3.5" />} color="var(--color-strength)">Training</BentoLabel>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-semibold tabular-nums">{exerciseCount}</span>
              <span className="text-sm text-muted-foreground">exercise{exerciseCount === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-auto pt-3 text-xs text-muted-foreground">
              {todayVolume > 0 ? `${todayVolume.toLocaleString()} kg volume` : "Log your first set →"}
            </div>
          </Link>
        </BentoCard>

        {/* Quick actions */}
        <BentoCard className="col-span-1 lg:col-span-3 bg-foreground text-background">
          <BentoLabel icon={<TrendingUp className="h-3.5 w-3.5" />} color="oklch(0.78 0.14 165)" muted>Progress</BentoLabel>
          <p className="mt-3 text-sm leading-snug opacity-80">View your last 14 days, body weight & macros.</p>
          <Link to="/progress" className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline">
            Open report <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </BentoCard>

        {/* Consistency strip */}
        <BentoCard className="col-span-2 lg:col-span-12">
          <div className="mb-3 flex items-baseline justify-between">
            <BentoLabel>Last 28 days</BentoLabel>
            <span className="text-xs text-muted-foreground">{active.size} active</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}>
            {days.map((d, i) => {
              const k = format(d, "yyyy-MM-dd");
              const on = active.has(k);
              const isToday = i === days.length - 1;
              return (
                <div
                  key={k}
                  title={format(d, "MMM d")}
                  className={cn(
                    "aspect-square rounded-md transition-all",
                    on ? "bg-gradient-primary shadow-soft" : "bg-secondary",
                    isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                  )}
                />
              );
            })}
          </div>
        </BentoCard>
      </section>
    </div>
  );
}

function BentoCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card sm:p-6",
        className,
      )}
    >
      {children}
    </div>
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
    <div className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]", muted ? "text-background/60" : "text-muted-foreground")}>
      {icon && (
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md"
          style={color ? { background: `color-mix(in oklab, ${color} 18%, transparent)`, color } : undefined}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}
