import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { WEEKDAYS, todayWeekday } from "@/lib/weekdays";
import { COMMON_FOODS, MEAL_TYPES, scaleMacros } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, CalendarDays, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface PlanItem {
  id: string;
  weekday: number;
  position: number;
  meal_type: string;
  name: string;
  calories: number;
  protein_g: number;
  grams: number | null;
}

export function WeeklyMealPlan({ onLogged }: { onLogged?: () => void }) {
  const { user } = useAuth();
  const [day, setDay] = useState<number>(todayWeekday());
  const [items, setItems] = useState<PlanItem[]>([]);
  const [mealType, setMealType] = useState<string>("breakfast");
  const [presetName, setPresetName] = useState<string>(COMMON_FOODS[0].name);
  const [grams, setGrams] = useState<string>(String(COMMON_FOODS[0].defaultGrams ?? 100));
  const [busy, setBusy] = useState(false);

  const preset = useMemo(() => COMMON_FOODS.find((f) => f.name === presetName), [presetName]);
  const scaled = useMemo(() => preset ? scaleMacros(preset, parseFloat(grams) || 0) : { calories: 0, protein_g: 0 }, [preset, grams]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meal_plan_items").select("*").order("weekday").order("position");
    setItems((data ?? []).map((m: any) => ({ ...m, protein_g: Number(m.protein_g), grams: m.grams != null ? Number(m.grams) : null })) as PlanItem[]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (preset?.defaultGrams) setGrams(String(preset.defaultGrams)); }, [preset]);

  const dayItems = useMemo(() => items.filter((i) => i.weekday === day), [items, day]);

  const add = async () => {
    if (!user || !preset) return;
    setBusy(true);
    const g = parseFloat(grams) || 0;
    const { error } = await supabase.from("meal_plan_items").insert({
      user_id: user.id, weekday: day, position: dayItems.length, meal_type: mealType,
      name: preset.name, calories: scaled.calories, protein_g: scaled.protein_g, grams: g,
    });
    if (error) toast.error(error.message);
    else { toast.success("Added to plan"); load(); }
    setBusy(false);
  };

  const remove = async (id: string) => {
    await supabase.from("meal_plan_items").delete().eq("id", id);
    load();
  };

  const logToToday = async (it: PlanItem) => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, date: today, meal_type: it.meal_type, name: it.name,
      calories: it.calories, protein_g: it.protein_g, grams: it.grams,
    });
    if (error) toast.error(error.message);
    else { toast.success(`Logged ${it.name}`); onLogged?.(); }
  };

  const logAllForToday = async () => {
    const td = todayWeekday();
    const todays = items.filter((i) => i.weekday === td);
    if (!todays.length) { toast.error("No meals planned for today"); return; }
    for (const it of todays) await logToToday(it);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-vital text-accent-foreground shadow-soft">
            <CalendarDays className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold tracking-tight">Weekly diet</h2>
        </div>
        <Button onClick={logAllForToday} size="sm" className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Play className="mr-1 h-3 w-3" /> Run today
        </Button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {WEEKDAYS.map((w) => {
          const isToday = w.idx === todayWeekday();
          const count = items.filter((i) => i.weekday === w.idx).length;
          return (
            <button
              key={w.idx}
              onClick={() => setDay(w.idx)}
              className={cn(
                "pressable relative flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-2 py-2 text-[11px] font-medium transition-all",
                day === w.idx
                  ? "border-foreground bg-foreground text-background shadow-soft"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{w.short}</span>
              <span className={cn("mt-0.5 font-mono text-[9px]", day === w.idx ? "text-background/70" : "text-muted-foreground")}>{count}</span>
              {isToday && <span className={cn("absolute right-1 top-1 h-1.5 w-1.5 rounded-full", day === w.idx ? "bg-background" : "bg-primary")} />}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl glass-tint p-3 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_TYPES.map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={cn(
                "pressable rounded-xl border px-1 py-2 text-[11px] font-medium capitalize transition-all",
                mealType === m ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground",
              )}
            >{m}</button>
          ))}
        </div>
        <Select value={presetName} onValueChange={setPresetName}>
          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {COMMON_FOODS.map((f) => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">Grams</Label>
            <Input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="no-spin h-10 rounded-xl text-center font-mono" />
          </div>
          <div className="text-right font-mono text-xs text-muted-foreground">
            {scaled.calories} kcal<br />{scaled.protein_g}g P
          </div>
        </div>
        <Button onClick={add} disabled={busy} className="h-11 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90">
          <Plus className="mr-1 h-4 w-4" /> Add to plan
        </Button>
      </div>

      <div className="space-y-2">
        {dayItems.length === 0 ? (
          <div className="rounded-2xl glass-tint p-6 text-center">
            <Utensils className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No meals planned. Add one above.</p>
          </div>
        ) : MEAL_TYPES.map((mt) => {
          const group = dayItems.filter((i) => i.meal_type === mt);
          if (!group.length) return null;
          return (
            <div key={mt} className="space-y-1">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{mt}</div>
              {group.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-xl glass p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{it.calories} kcal · {it.protein_g}g · {it.grams}g</div>
                  </div>
                  <button onClick={() => logToToday(it)} className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-foreground px-2.5 text-[10px] font-medium text-background hover:bg-foreground/90">
                    <Play className="h-3 w-3" /> Log
                  </button>
                  <button onClick={() => remove(it.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
