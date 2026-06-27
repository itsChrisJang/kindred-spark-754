
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_age_min int NOT NULL DEFAULT 23,
  ADD COLUMN IF NOT EXISTS preferred_age_max int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS use_age_window boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_window_n int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS active_areas text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS residence text,
  ADD COLUMN IF NOT EXISTS height_self int,
  ADD COLUMN IF NOT EXISTS height_pref text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS drinking text,
  ADD COLUMN IF NOT EXISTS exclude_same_company boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rematch_previous boolean NOT NULL DEFAULT false;
