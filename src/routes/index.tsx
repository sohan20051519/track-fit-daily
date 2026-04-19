import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Beef, Dumbbell, Flame as Fire } from "lucide-react";

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: meals }, { data: workouts }, { data: weekWorkouts }, { data: w }] = await Promise.all([
        supabase.from("profiles").select("display_name, daily_calorie_goal, daily_protein_goal").eq("id", user.id).maybeSingle(),
        supabase.from("meals").select("calories, protein_g").eq("date", today),
        supabase.from("workouts").select("id").eq("date", today),
        supabase.from("workouts").select("date").gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
        supabase.from("weight_logs").select("weight_kg").eq("date", today).maybeSingle(),
      ]);
      setProfile(p);
      setCalories((meals ?? []).reduce((s, m) => s + (m.calories ?? 0), 0));
      setProtein((meals ?? []).reduce((s, m) => s + Number(m.protein_g ?? 0), 0));
      setExerciseCount((workouts ?? []).length);
      setTodayWeight(w ? Number(w.weight_kg) : null);

      const { data: mealDates } = await supabase.from("meals").select("date").gte("date", format(subDays(new Date(), 30), "yyyy-MM-dd"));
      const activeSet = new Set<string>([
        ...(weekWorkouts ?? []).map((x) => x.date),
        ...(mealDates ?? []).map((m) => m.date),
      ]);
      let s = 0;
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        if (activeSet.has(d)) s++;
        else if (i > 0) break;
      }
      setStreak(s);
    })();
  }, [user, today]);

  const calGoal = profile?.daily_calorie_goal ?? 2200;
  const proGoal = profile?.daily_protein_goal ?? 150;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Hi, {profile?.display_name ?? "there"}.
        </h1>
        {todayWeight && (
          <p className="mt-1 text-sm text-muted-foreground">Today's weight: <span className="font-medium text-foreground">{todayWeight} kg</span></p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Fire className="h-5 w-5" />} label="Streak" value={`${streak}`} hint="day(s) active" tone="primary" />
        <Stat icon={<Dumbbell className="h-5 w-5" />} label="Exercises today" value={`${exerciseCount}`} hint="logged" tone="accent" />
        <Stat icon={<Flame className="h-5 w-5" />} label="Calories" value={`${calories}`} hint={`/ ${calGoal}`} tone="primary" />
        <Stat icon={<Beef className="h-5 w-5" />} label="Protein" value={`${Math.round(protein)}g`} hint={`/ ${proGoal}g`} tone="accent" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Daily nutrition</h2>
          <div className="mt-4 space-y-4">
            <Bar label="Calories" value={calories} max={calGoal} unit="kcal" />
            <Bar label="Protein" value={Math.round(protein)} max={proGoal} unit="g" />
          </div>
          <Link to="/nutrition" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Log a meal →
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Today's training</h2>
          {exerciseCount === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No exercises logged yet.</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{exerciseCount} exercise(s) logged today.</p>
          )}
          <Link to="/workouts" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Log a workout →
          </Link>
        </Card>
      </div>

      <ConsistencyStrip />
    </div>
  );
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: "primary" | "accent" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone === "primary" ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"}`}>{icon}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

function Bar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{value} / {max} {unit}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function ConsistencyStrip() {
  const { user } = useAuth();
  const [active, setActive] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = format(subDays(new Date(), 27), "yyyy-MM-dd");
      const [{ data: w }, { data: m }] = await Promise.all([
        supabase.from("workouts").select("date").gte("date", since),
        supabase.from("meals").select("date").gte("date", since),
      ]);
      setActive(new Set([...(w ?? []).map((x) => x.date), ...(m ?? []).map((x) => x.date)]));
    })();
  }, [user]);

  const days = eachDayOfInterval({ start: subDays(new Date(), 27), end: new Date() });

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Last 28 days</h2>
        <span className="text-sm text-muted-foreground">{active.size} active days</span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}>
        {days.map((d) => {
          const k = format(d, "yyyy-MM-dd");
          const on = active.has(k);
          return (
            <div
              key={k}
              title={format(d, "MMM d")}
              className={`aspect-square rounded-md ${on ? "bg-primary" : "bg-secondary"}`}
            />
          );
        })}
      </div>
    </Card>
  );
}
