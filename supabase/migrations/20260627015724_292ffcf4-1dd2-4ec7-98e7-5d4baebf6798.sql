ALTER TABLE public.date_places
  ADD COLUMN IF NOT EXISTS kakao_place_id TEXT,
  ADD COLUMN IF NOT EXISTS kakao_place_url TEXT,
  ADD COLUMN IF NOT EXISTS kakao_phone TEXT,
  ADD COLUMN IF NOT EXISTS kakao_category TEXT,
  ADD COLUMN IF NOT EXISTS kakao_enriched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS date_places_kakao_enriched_at_idx
  ON public.date_places (kakao_enriched_at);