ALTER TABLE post
ADD COLUMN IF NOT EXISTS sort_priority integer GENERATED ALWAYS AS (
  CASE WHEN site = 'SOLO_OFF' THEN 1 ELSE 0 END
) STORED;

CREATE INDEX IF NOT EXISTS idx_post_sort ON post (sort_priority ASC, crawled_at DESC);
