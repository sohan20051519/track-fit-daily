-- Extend profiles with biometric data for auto-calculated goals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS goal_type text DEFAULT 'maintain',
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

-- Daily weight log
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weight select" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own weight insert" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weight update" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own weight delete" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);

-- Add grams to meals so portion is editable & macros scale
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS grams numeric;