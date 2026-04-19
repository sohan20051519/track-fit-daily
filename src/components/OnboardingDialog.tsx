import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTIVITY_LEVELS, GENDERS, GOAL_TYPES, calculateGoals } from "@/lib/goals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";

export function OnboardingDialog({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { user } = useAuth();
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
    if (!h || !w || !birth) {
      toast.error("Please fill in all fields");
      return;
    }
    setBusy(true);
    const goals = calculateGoals({
      gender, birthDate: birth, heightCm: h, weightKg: w, activityLevel: activity, goalType: goal,
    });
    const today = format(new Date(), "yyyy-MM-dd");

    const { error: e1 } = await supabase.from("profiles").update({
      gender, birth_date: birth, height_cm: h,
      activity_level: activity, goal_type: goal, onboarded: true,
      daily_calorie_goal: goals.calories, daily_protein_goal: goals.protein,
    }).eq("id", user.id);

    const { error: e2 } = await supabase.from("weight_logs").upsert(
      { user_id: user.id, date: today, weight_kg: w },
      { onConflict: "user_id,date" }
    );

    setBusy(false);
    if (e1 || e2) {
      toast.error(e1?.message || e2?.message || "Failed");
      return;
    }
    toast.success(`Goals set: ${goals.calories} kcal · ${goals.protein}g protein`);
    onDone();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to Pulse</DialogTitle>
          <DialogDescription>
            Tell us a bit about you so we can set your daily targets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of birth</Label>
              <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              <Input type="number" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weight today (kg)</Label>
              <Input type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Activity level</Label>
            <Select value={activity} onValueChange={setActivity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Goal</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            Calculate my targets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
