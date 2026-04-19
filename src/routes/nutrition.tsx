import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { COMMON_FOODS, MEAL_TYPES, scaleMacros, type FoodPreset } from "@/lib/constants";
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
  id: string; name: string; meal_type: string; calories: number; protein_g: number; grams: number | null;
}

function NutritionPage() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [presetName, setPresetName] = useState<string>(COMMON_FOODS[0].name);
  const [grams, setGrams] = useState<string>(String(COMMON_FOODS[0].defaultGrams ?? 100));
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [customPro, setCustomPro] = useState("");
  const [mealType, setMealType] = useState<string>("breakfast");
  const [items, setItems] = useState<MealRow[]>([]);
  const [busy, setBusy] = useState(false);

  const preset = useMemo<FoodPreset | undefined>(
    () => COMMON_FOODS.find((f) => f.name === presetName),
    [presetName]
  );
  const scaled = useMemo(() => {
    if (!preset) return { calories: 0, protein_g: 0 };
    return scaleMacros(preset, parseFloat(grams) || 0);
  }, [preset, grams]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("id, name, meal_type, calories, protein_g, grams")
      .eq("date", today)
      .order("created_at", { ascending: false });
    setItems((data ?? []).map((m: any) => ({ ...m, protein_g: Number(m.protein_g), grams: m.grams != null ? Number(m.grams) : null })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (preset?.defaultGrams) setGrams(String(preset.defaultGrams));
  }, [preset]);

  const save = async () => {
    if (!user) return;
    setBusy(true);

    let payload: { name: string; calories: number; protein_g: number; grams: number | null };

    if (mode === "preset") {
      if (!preset) { setBusy(false); return; }
      const g = parseFloat(grams) || 0;
      const unitLabel = preset.perUnit ? ` (${(g / preset.perUnit.gramsPerUnit).toFixed(1)} ${preset.perUnit.unitLabel})` : "";
      payload = {
        name: `${preset.name}${unitLabel}`,
        calories: scaled.calories,
        protein_g: scaled.protein_g,
        grams: g,
      };
    } else {
      if (!customName) { setBusy(false); return; }
      payload = {
        name: customName,
        calories: parseInt(customCal) || 0,
        protein_g: parseFloat(customPro) || 0,
        grams: null,
      };
    }

    const { error } = await supabase.from("meals").insert({
      user_id: user.id, date: today, meal_type: mealType, ...payload,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Meal logged");
      setCustomName(""); setCustomCal(""); setCustomPro("");
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
      <div className="flex items-end justify-between gap-4">
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a meal</h2>
          <div className="flex rounded-full bg-secondary p-1 text-xs font-medium">
            <button
              onClick={() => setMode("preset")}
              className={`rounded-full px-3 py-1.5 transition-colors ${mode === "preset" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Common foods
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`rounded-full px-3 py-1.5 transition-colors ${mode === "custom" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Custom
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Meal</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {mode === "preset" ? (
            <>
              <div className="space-y-2">
                <Label>Food</Label>
                <Select value={presetName} onValueChange={setPresetName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMON_FOODS.map((f) => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Portion (grams)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                    />
                    {preset?.perUnit && (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        ≈ {((parseFloat(grams) || 0) / preset.perUnit.gramsPerUnit).toFixed(1)} {preset.perUnit.unitLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-secondary/60 p-3">
                  <div className="text-xs text-muted-foreground">This will add</div>
                  <div className="mt-1 text-base font-semibold">
                    {scaled.calories} kcal · {scaled.protein_g}g protein
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Food name</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Chicken & rice bowl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input type="number" inputMode="numeric" value={customCal} onChange={(e) => setCustomCal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input type="number" inputMode="decimal" value={customPro} onChange={(e) => setCustomPro(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <Button onClick={save} disabled={busy || (mode === "custom" && !customName)}>
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
                  {m.grams && <div className="text-xs text-muted-foreground">{m.grams}g</div>}
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
