-- Profile preferences for weigh-in cadence
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_track_frequency text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS preferred_weigh_day smallint NOT NULL DEFAULT 1;

-- Weekly workout plan template (one row per planned exercise per weekday)
CREATE TABLE IF NOT EXISTS public.workout_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  position smallint NOT NULL DEFAULT 0,
  body_part text NOT NULL,
  exercise_name text NOT NULL,
  target_sets smallint NOT NULL DEFAULT 3,
  target_reps smallint NOT NULL DEFAULT 10,
  target_weight_kg numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wp select" ON public.workout_plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own wp insert" ON public.workout_plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own wp update" ON public.workout_plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own wp delete" ON public.workout_plan_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wp_user_day ON public.workout_plan_items(user_id, weekday);

-- Weekly meal plan template
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  position smallint NOT NULL DEFAULT 0,
  meal_type text NOT NULL DEFAULT 'breakfast',
  name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  grams numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mp select" ON public.meal_plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own mp insert" ON public.meal_plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mp update" ON public.meal_plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own mp delete" ON public.meal_plan_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mp_user_day ON public.meal_plan_items(user_id, weekday);