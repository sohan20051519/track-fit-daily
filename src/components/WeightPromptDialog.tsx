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
      { onConflict: "user_id,date" }
    );
    // Recalculate goals if profile is complete
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Daily check-in</DialogTitle>
          <DialogDescription>What's your weight today? We'll update your targets automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Skip</Button>
          <Button onClick={save} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
