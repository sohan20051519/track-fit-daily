import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { calculateGoals } from "@/lib/goals";
import { toast } from "sonner";
import { format } from "date-fns";
import { Scale, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultWeight?: number;
  profile: {
    gender: string | null;
    birth_date: string | null;
    height_cm: number | null;
    activity_level: string | null;
    goal_type: string | null;
  };
}

export function WeightPromptDialog({ open, onClose, defaultWeight, profile }: Props) {
  const { user } = useAuth();
  const [weight, setWeight] = useState(String(defaultWeight ?? 70));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user) return;
    const w = parseFloat(weight);
    if (!w) return;
    setBusy(true);
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("weight_logs").upsert(
      { user_id: user.id, date: today, weight_kg: w },
      { onConflict: "user_id,date" },
    );
    if (profile.gender && profile.birth_date && profile.height_cm && profile.activity_level && profile.goal_type) {
      const goals = calculateGoals({
        gender: profile.gender,
        birthDate: profile.birth_date,
        heightCm: Number(profile.height_cm),
        weightKg: w,
        activityLevel: profile.activity_level,
        goalType: profile.goal_type,
      });
      await supabase.from("profiles").update({
        daily_calorie_goal: goals.calories,
        daily_protein_goal: goals.protein,
      }).eq("id", user.id);
      toast.success(`Targets updated: ${goals.calories} kcal · ${goals.protein}g`);
    } else {
      toast.success("Weight logged");
    }
    setBusy(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm rounded-3xl p-6 sm:p-8">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-focus text-primary-foreground shadow-soft">
            <Scale className="h-5 w-5" />
          </div>
          <DialogTitle className="font-serif-display text-2xl">Daily check-in</DialogTitle>
          <DialogDescription>What's your weight today? We'll update your targets automatically.</DialogDescription>
        </DialogHeader>
        <div className="my-2 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weight (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            autoFocus
            className="h-14 rounded-2xl text-center font-mono text-3xl font-semibold"
          />
        </div>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="ghost" onClick={onClose} className="h-12 flex-1 rounded-2xl">Skip</Button>
          <Button onClick={save} disabled={busy} className="group h-12 flex-1 rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card">
            Save <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
