
CREATE TABLE public.post (
  id             VARCHAR(36)   PRIMARY KEY,
  site           VARCHAR(20)   NOT NULL,
  source_id      VARCHAR(255)  NOT NULL,
  title          VARCHAR(255)  NOT NULL,
  soldout        BOOLEAN       NOT NULL,
  crawled_at     TIMESTAMPTZ   NOT NULL,
  crawl_job_id   VARCHAR(36)   NOT NULL,
  posted_date    DATE,
  price          BIGINT,
  list_price     BIGINT,
  coupon_price   BIGINT,
  region         VARCHAR(255),
  region_group   VARCHAR(255),
  code           VARCHAR(255),
  address        TEXT,
  badges         TEXT,
  content_text   TEXT,
  datetime       TEXT,
  detail_url     TEXT,
  duration       TEXT,
  image_url      TEXT,
  map_link       TEXT,
  promo          TEXT,
  sessions       TEXT,
  venue          TEXT,
  CONSTRAINT uk_post_site_source_id UNIQUE (site, source_id)
);

GRANT SELECT ON public.post TO anon, authenticated;
GRANT ALL ON public.post TO service_role;

ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_public_read" ON public.post
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE INDEX idx_post_site ON public.post (site);
CREATE INDEX idx_post_crawled_at ON public.post (crawled_at DESC);
CREATE INDEX idx_post_region_group ON public.post (region_group);
