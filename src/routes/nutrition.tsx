import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { COMMON_FOODS, MEAL_TYPES, scaleMacros, type FoodPreset } from "@/lib/constants";
import { Plus, Trash2, Utensils, Coffee, Sun, Moon, Cookie, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Pulse" }] }),
  component: () => (
    <RequireAuth>
      <NutritionPage />
    </RequireAuth>
  ),
});

interface MealRow { id: string; name: string; meal_type: string; calories: number; protein_g: number; grams: number | null }

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee className="h-3.5 w-3.5" />,
  lunch: <Sun className="h-3.5 w-3.5" />,
  dinner: <Moon className="h-3.5 w-3.5" />,
  snack: <Cookie className="h-3.5 w-3.5" />,
};

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

  const preset = useMemo<FoodPreset | undefined>(() => COMMON_FOODS.find((f) => f.name === presetName), [presetName]);
  const scaled = useMemo(() => preset ? scaleMacros(preset, parseFloat(grams) || 0) : { calories: 0, protein_g: 0 }, [preset, grams]);

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
  useEffect(() => { if (preset?.defaultGrams) setGrams(String(preset.defaultGrams)); }, [preset]);

  const stepGrams = (delta: number) => setGrams((g) => String(Math.max(0, (parseFloat(g) || 0) + delta)));

  const save = async () => {
    if (!user) return;
    setBusy(true);
    let payload: { name: string; calories: number; protein_g: number; grams: number | null };

    if (mode === "preset") {
      if (!preset) { setBusy(false); return; }
      const g = parseFloat(grams) || 0;
      const unitLabel = preset.perUnit ? ` (${(g / preset.perUnit.gramsPerUnit).toFixed(1)} ${preset.perUnit.unitLabel})` : "";
      payload = { name: `${preset.name}${unitLabel}`, calories: scaled.calories, protein_g: scaled.protein_g, grams: g };
    } else {
      if (!customName) { setBusy(false); return; }
      payload = { name: customName, calories: parseInt(customCal) || 0, protein_g: parseFloat(customPro) || 0, grams: null };
    }

    const { error } = await supabase.from("meals").insert({ user_id: user.id, date: today, meal_type: mealType, ...payload });
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

  const groups = MEAL_TYPES.map((t) => ({ type: t, items: items.filter((m) => m.meal_type === t) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4 stagger sm:space-y-5">
      {/* Header bento */}
      <section className="grid grid-cols-6 gap-2.5 sm:gap-3">
        <div className="col-span-6 rounded-3xl glass specular p-4 sm:col-span-3 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{format(new Date(), "EEEE")}</p>
          <h1 className="mt-1 font-serif-display text-4xl leading-none sm:text-5xl">Nutrition</h1>
        </div>
        <div className="col-span-3 rounded-3xl glass specular p-3 text-center sm:col-span-1 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calories</div>
          <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{totalCal}</div>
        </div>
        <div className="col-span-3 rounded-3xl glass specular p-3 text-center sm:col-span-1 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Protein</div>
          <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{Math.round(totalPro)}g</div>
        </div>
        <div className="col-span-6 rounded-3xl bg-foreground p-3 text-center text-background shadow-card sm:col-span-1 sm:p-4">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-70">Meals</div>
          <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{items.length}</div>
        </div>
      </section>

      {/* Logger */}
      <div className="rounded-3xl glass specular p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-vital text-accent-foreground shadow-soft">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Add a meal</h2>
          </div>
          <div className="inline-flex rounded-full bg-white/50 p-1 text-[11px] font-medium backdrop-blur">
            {(["preset", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-3 py-1 transition-all",
                  mode === m ? "bg-foreground text-background shadow-soft" : "text-muted-foreground",
                )}
              >
                {m === "preset" ? "Common" : "Custom"}
              </button>
            ))}
          </div>
        </div>

        {/* Meal pills */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meal</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map((m) => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={cn(
                  "pressable flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-[11px] font-medium capitalize transition-all",
                  mealType === m
                    ? "border-foreground bg-foreground text-background shadow-soft"
                    : "border-white/50 bg-white/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {MEAL_ICONS[m]}
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode === "preset" ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Food</Label>
              <Select value={presetName} onValueChange={setPresetName}>
                <SelectTrigger className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMON_FOODS.map((f) => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Portion</Label>
              <div className="rounded-2xl glass-tint p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-full border-white/60 bg-white/60" onClick={() => stepGrams(-10)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-1 items-baseline justify-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      className="no-spin h-12 max-w-[6.5rem] rounded-xl border-transparent bg-white/70 text-center font-mono text-2xl font-semibold"
                    />
                    <span className="text-sm font-medium text-muted-foreground">g</span>
                  </div>
                  <Button type="button" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => stepGrams(10)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {preset?.perUnit && (
                  <div className="mt-1.5 text-center text-[11px] text-muted-foreground">
                    ≈ {((parseFloat(grams) || 0) / preset.perUnit.gramsPerUnit).toFixed(1)} {preset.perUnit.unitLabel}{((parseFloat(grams) || 0) / preset.perUnit.gramsPerUnit) === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MacroPreview label="Calories" value={`${scaled.calories}`} unit="kcal" color="var(--color-energy)" />
              <MacroPreview label="Protein" value={`${scaled.protein_g}`} unit="g" color="var(--color-vital)" />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Food name</Label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Chicken & rice bowl" className="h-12 rounded-2xl border-white/50 bg-white/40 backdrop-blur" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Calories</Label>
                <Input type="number" inputMode="numeric" value={customCal} onChange={(e) => setCustomCal(e.target.value)} placeholder="0" className="no-spin h-12 rounded-2xl border-white/50 bg-white/40 font-mono backdrop-blur" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Protein (g)</Label>
                <Input type="number" inputMode="decimal" value={customPro} onChange={(e) => setCustomPro(e.target.value)} placeholder="0" className="no-spin h-12 rounded-2xl border-white/50 bg-white/40 font-mono backdrop-blur" />
              </div>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={busy || (mode === "custom" && !customName)} className="mt-4 h-12 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-card">
          <Plus className="mr-1 h-4 w-4" /> Add meal
        </Button>
      </div>

      {/* Today's meals */}
      <div>
        <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Today's meals</h2>
        {items.length === 0 ? (
          <div className="rounded-3xl glass-tint specular p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-muted-foreground">
              <Utensils className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Nothing logged yet.</p>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {groups.map((g) => {
              const cal = g.items.reduce((s, x) => s + x.calories, 0);
              const pro = g.items.reduce((s, x) => s + x.protein_g, 0);
              return (
                <div key={g.type}>
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/60 text-muted-foreground">
                        {MEAL_ICONS[g.type]}
                      </span>
                      <span className="text-xs font-semibold capitalize">{g.type}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{cal} kcal · {Math.round(pro)}g</span>
                  </div>
                  <div className="space-y-1">
                    {g.items.map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5 rounded-2xl glass specular p-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{m.name}</div>
                          {m.grams && <div className="font-mono text-[10px] text-muted-foreground">{m.grams}g</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold tabular-nums">{m.calories}<span className="text-[9px] text-muted-foreground"> kcal</span></div>
                          <div className="font-mono text-[10px] text-muted-foreground">{m.protein_g}g P</div>
                        </div>
                        <button onClick={() => del(m.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPreview({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-2xl glass-tint p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums">
        {value}<span className="text-[10px] text-muted-foreground"> {unit}</span>
      </div>
    </div>
  );
}
