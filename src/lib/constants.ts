export const BODY_PARTS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Core",
  "Cardio",
] as const;

export const EXERCISES_BY_PART: Record<string, string[]> = {
  Chest: ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Push-Up", "Dips"],
  Back: ["Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row"],
  Shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Arnold Press"],
  Biceps: ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Cable Curl"],
  Triceps: ["Tricep Pushdown", "Skull Crusher", "Overhead Extension", "Close-Grip Bench", "Dips"],
  Legs: ["Squat", "Leg Press", "Romanian Deadlift", "Lunges", "Leg Extension", "Leg Curl"],
  Glutes: ["Hip Thrust", "Glute Bridge", "Bulgarian Split Squat", "Cable Kickback"],
  Core: ["Plank", "Crunches", "Hanging Leg Raise", "Russian Twist", "Cable Crunch"],
  Cardio: ["Running", "Cycling", "Rowing", "Stair Climber", "Jump Rope"],
};

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

// Macros are PER 100 g (or per-unit for unit foods). User edits portion size.
export interface FoodPreset {
  name: string;
  // either grams-based (cal_per_100g) OR unit-based (cal_per_unit + unit_label + default_units)
  per100g?: { calories: number; protein_g: number };
  perUnit?: { calories: number; protein_g: number; unitLabel: string; gramsPerUnit: number };
  defaultGrams?: number;
}

export const COMMON_FOODS: FoodPreset[] = [
  { name: "Chicken Breast", per100g: { calories: 165, protein_g: 31 }, defaultGrams: 150 },
  { name: "Brown Rice (cooked)", per100g: { calories: 130, protein_g: 2.7 }, defaultGrams: 200 },
  { name: "White Rice (cooked)", per100g: { calories: 130, protein_g: 2.4 }, defaultGrams: 200 },
  { name: "Egg (whole)", perUnit: { calories: 78, protein_g: 6.5, unitLabel: "egg", gramsPerUnit: 50 }, defaultGrams: 100 },
  { name: "Greek Yogurt", per100g: { calories: 59, protein_g: 10 }, defaultGrams: 170 },
  { name: "Oatmeal (dry)", per100g: { calories: 379, protein_g: 13 }, defaultGrams: 50 },
  { name: "Salmon", per100g: { calories: 208, protein_g: 20 }, defaultGrams: 150 },
  { name: "Banana", perUnit: { calories: 105, protein_g: 1.3, unitLabel: "banana", gramsPerUnit: 118 }, defaultGrams: 118 },
  { name: "Apple", perUnit: { calories: 95, protein_g: 0.5, unitLabel: "apple", gramsPerUnit: 182 }, defaultGrams: 182 },
  { name: "Whey Protein", perUnit: { calories: 120, protein_g: 24, unitLabel: "scoop", gramsPerUnit: 30 }, defaultGrams: 30 },
  { name: "Almonds", per100g: { calories: 579, protein_g: 21 }, defaultGrams: 28 },
  { name: "Sweet Potato", per100g: { calories: 86, protein_g: 1.6 }, defaultGrams: 200 },
  { name: "Paneer", per100g: { calories: 265, protein_g: 18 }, defaultGrams: 100 },
  { name: "Roti / Chapati", perUnit: { calories: 104, protein_g: 3.1, unitLabel: "roti", gramsPerUnit: 40 }, defaultGrams: 40 },
  { name: "Dal (cooked lentils)", per100g: { calories: 116, protein_g: 9 }, defaultGrams: 200 },
  { name: "Milk (whole)", per100g: { calories: 61, protein_g: 3.2 }, defaultGrams: 250 },
  { name: "Peanut Butter", per100g: { calories: 588, protein_g: 25 }, defaultGrams: 32 },
  { name: "Tofu", per100g: { calories: 76, protein_g: 8 }, defaultGrams: 150 },
  { name: "Tuna (canned, drained)", per100g: { calories: 116, protein_g: 26 }, defaultGrams: 100 },
  { name: "Bread (whole wheat)", perUnit: { calories: 80, protein_g: 4, unitLabel: "slice", gramsPerUnit: 30 }, defaultGrams: 30 },
];

export function scaleMacros(food: FoodPreset, grams: number) {
  if (food.per100g) {
    const f = grams / 100;
    return {
      calories: Math.round(food.per100g.calories * f),
      protein_g: Math.round(food.per100g.protein_g * f * 10) / 10,
    };
  }
  if (food.perUnit) {
    const units = grams / food.perUnit.gramsPerUnit;
    return {
      calories: Math.round(food.perUnit.calories * units),
      protein_g: Math.round(food.perUnit.protein_g * units * 10) / 10,
    };
  }
  return { calories: 0, protein_g: 0 };
}
