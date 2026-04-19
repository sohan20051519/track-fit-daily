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

export const COMMON_FOODS: { name: string; calories: number; protein_g: number }[] = [
  { name: "Chicken Breast (100g)", calories: 165, protein_g: 31 },
  { name: "Brown Rice (1 cup)", calories: 215, protein_g: 5 },
  { name: "Eggs (2 whole)", calories: 155, protein_g: 13 },
  { name: "Greek Yogurt (170g)", calories: 100, protein_g: 17 },
  { name: "Oatmeal (1 cup)", calories: 158, protein_g: 6 },
  { name: "Salmon (100g)", calories: 208, protein_g: 20 },
  { name: "Banana", calories: 105, protein_g: 1 },
  { name: "Whey Protein (1 scoop)", calories: 120, protein_g: 24 },
  { name: "Almonds (28g)", calories: 164, protein_g: 6 },
  { name: "Sweet Potato (1 medium)", calories: 112, protein_g: 2 },
];
