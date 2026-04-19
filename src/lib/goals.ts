// Mifflin-St Jeor BMR + activity multiplier → calorie goal
// Protein: 1.8 g per kg bodyweight (lean default for active users)

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little/no exercise)", mult: 1.2 },
  { value: "light", label: "Light (1–3 days/week)", mult: 1.375 },
  { value: "moderate", label: "Moderate (3–5 days/week)", mult: 1.55 },
  { value: "active", label: "Active (6–7 days/week)", mult: 1.725 },
  { value: "athlete", label: "Athlete (2x/day)", mult: 1.9 },
] as const;

export const GOAL_TYPES = [
  { value: "lose", label: "Lose fat", delta: -400 },
  { value: "maintain", label: "Maintain", delta: 0 },
  { value: "gain", label: "Build muscle", delta: 300 },
] as const;

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export function ageFromBirthDate(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export interface GoalInput {
  gender: string;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: string;
  goalType: string;
}

export function calculateGoals(i: GoalInput): { calories: number; protein: number } {
  const age = ageFromBirthDate(i.birthDate);
  // Mifflin-St Jeor
  const bmr =
    i.gender === "female"
      ? 10 * i.weightKg + 6.25 * i.heightCm - 5 * age - 161
      : 10 * i.weightKg + 6.25 * i.heightCm - 5 * age + 5;
  const mult = ACTIVITY_LEVELS.find((a) => a.value === i.activityLevel)?.mult ?? 1.55;
  const delta = GOAL_TYPES.find((g) => g.value === i.goalType)?.delta ?? 0;
  const calories = Math.round((bmr * mult + delta) / 10) * 10;
  const protein = Math.round(i.weightKg * 1.8);
  return { calories, protein };
}
