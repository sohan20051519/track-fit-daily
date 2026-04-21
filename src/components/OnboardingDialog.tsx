import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LEVELS, GENDERS, GOAL_TYPES, calculateGoals } from "@/lib/goals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Activity, ArrowRight, Target, User, Ruler, Scale } from "lucide-react";

export function OnboardingDialog({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState("male");
  const [birth, setBirth] = useState("1995-01-01");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("70");
  const [activity, setActivity] = useState("moderate");
  const [goal, setGoal] = useState("maintain");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || !birth) { toast.error("Please fill in all fields"); return; }
    setBusy(true);
    const goals = calculateGoals({ gender, birthDate: birth, heightCm: h, weightKg: w, activityLevel: activity, goalType: goal });
    const today = format(new Date(), "yyyy-MM-dd");

    const { error: e1 } = await supabase.from("profiles").update({
      gender, birth_date: birth, height_cm: h, activity_level: activity, goal_type: goal, onboarded: true,
      daily_calorie_goal: goals.calories, daily_protein_goal: goals.protein,
    }).eq("id", user.id);

    const { error: e2 } = await supabase.from("weight_logs").upsert(
      { user_id: user.id, date: today, weight_kg: w },
      { onConflict: "user_id,date" },
    );

    setBusy(false);
    if (e1 || e2) { toast.error(e1?.message || e2?.message || "Failed"); return; }
    toast.success(`Goals set: ${goals.calories} kcal · ${goals.protein}g protein`);
    onDone();
  };

  const steps = [
    // Step 0 – basics
    <div key={0} className="space-y-4 animate-fade-in-up">
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gender</Label>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className={cn(
                "pressable flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                gender === g.value ? "border-foreground bg-foreground text-background shadow-soft" : "border-border hover:bg-secondary",
              )}
            >
              <User className="h-4 w-4" /> {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date of birth</Label>
        <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className="h-12 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            <Ruler className="mr-1 inline h-3.5 w-3.5" /> Height (cm)
          </Label>
          <Input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} className="h-12 rounded-2xl font-mono text-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            <Scale className="mr-1 inline h-3.5 w-3.5" /> Weight (kg)
          </Label>
          <Input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 rounded-2xl font-mono text-lg" />
        </div>
      </div>
    </div>,

    // Step 1 – activity & goal
    <div key={1} className="space-y-4 animate-fade-in-up">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Activity level</Label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value}
              onClick={() => setActivity(a.value)}
              className={cn(
                "pressable flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all",
                activity === a.value ? "border-foreground bg-foreground text-background shadow-soft" : "border-border hover:bg-secondary",
              )}
            >
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: activity === a.value ? "oklch(0.78 0.14 165)" : "oklch(0.85 0.005 80)" }} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          <Target className="mr-1 inline h-3.5 w-3.5" /> Goal
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_TYPES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={cn(
                "pressable rounded-2xl border px-3 py-3 text-sm font-medium transition-all",
                goal === g.value ? "border-foreground bg-foreground text-background shadow-soft" : "border-border hover:bg-secondary",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
  ];

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md rounded-3xl p-6 sm:p-8 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3 pb-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <DialogTitle className="font-serif-display text-2xl">
            {step === 0 ? "Welcome to Pulse" : "Almost there"}
          </DialogTitle>
          <DialogDescription>
            {step === 0
              ? "Tell us about you so we can set your daily targets."
              : "Set your activity level and goal — we'll calculate everything."}
          </DialogDescription>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {[0, 1].map((s) => (
              <div key={s} className={cn("h-1.5 rounded-full transition-all", s === step ? "w-8 bg-foreground" : "w-1.5 bg-secondary")} />
            ))}
          </div>
        </DialogHeader>

        {steps[step]}

        <div className="mt-2 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-12 flex-1 rounded-2xl">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="group h-12 flex-1 rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card"
            >
              Continue <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={busy}
              className="h-12 flex-1 rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card"
            >
              Calculate my targets
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
