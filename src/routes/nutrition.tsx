import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { COMMON_FOODS, MEAL_TYPES } from "@/lib/constants";
import { Plus, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <NutritionPage />
    </RequireAuth>
  ),
});

interface MealRow {
  id: string; name: string; meal_type: string; calories: number; protein_g: number;
}

function NutritionPage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<string>("breakfast");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [items, setItems] = useState<MealRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("id, name, meal_type, calories, protein_g")
      .eq("date", today)
      .order("created_at", { ascending: false });
    setItems((data ?? []).map((m: any) => ({ ...m, protein_g: Number(m.protein_g) })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const pickPreset = (n: string) => {
    const f = COMMON_FOODS.find((x) => x.name === n);
    if (!f) return;
    setName(f.name);
    setCal(String(f.calories));
    setPro(String(f.protein_g));
  };

  const save = async () => {
    if (!user || !name) return;
    setBusy(true);
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, date: today, name, meal_type: mealType,
      calories: parseInt(cal) || 0, protein_g: parseFloat(pro) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Meal logged");
      setName(""); setCal(""); setPro("");
      load();
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    await supabase.from("meals").delete().eq("id", id);
    load();
  };

  const totalCal = items.reduce((s, m) => s + m.calories, 0);
  const totalPro = items.reduce((s, m) => s + m.protein_g, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Nutrition</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log what you ate today.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Today</div>
          <div className="text-lg font-semibold">{totalCal} kcal · {Math.round(totalPro)}g P</div>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Add a meal</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quick pick</Label>
            <Select onValueChange={pickPreset}>
              <SelectTrigger><SelectValue placeholder="Choose from common foods…" /></SelectTrigger>
              <SelectContent>
                {COMMON_FOODS.map((f) => (
                  <SelectItem key={f.name} value={f.name}>{f.name} — {f.calories}kcal, {f.protein_g}g P</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Food name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken & rice bowl" />
            </div>
            <div className="space-y-2">
              <Label>Meal</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input type="number" inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input type="number" inputMode="decimal" value={pro} onChange={(e) => setPro(e.target.value)} />
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={busy || !name}>
            <Plus className="mr-1 h-4 w-4" /> Add meal
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Today's meals</h2>
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <Utensils className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Nothing logged yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <Card key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.meal_type}</div>
                  <div className="font-medium">{m.name}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="font-medium">{m.calories} kcal</div>
                    <div className="text-muted-foreground">{m.protein_g}g protein</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => del(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
