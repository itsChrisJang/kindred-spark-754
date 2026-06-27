ALTER TABLE public.date_places
  ADD COLUMN IF NOT EXISTS kakao_image_url TEXT,
  ADD COLUMN IF NOT EXISTS kakao_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS kakao_review_count INTEGER,
  ADD COLUMN IF NOT EXISTS kakao_title TEXT;