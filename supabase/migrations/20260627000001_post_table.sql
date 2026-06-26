-- ─────────────────────────────────────────────────
--  post 테이블 (MySQL → PostgreSQL 변환)
--  크롤링된 소개팅/미팅 공고 데이터
-- ─────────────────────────────────────────────────

CREATE TYPE public.post_site AS ENUM (
  'LOVEMATCHING',
  'MISEOL',
  'MODPARTY',
  'ORANGES',
  'RETURN2ME',
  'SOLO_OFF',
  'YEONIN'
);

CREATE TABLE public.post (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  address      text,
  crawl_job_id text        NOT NULL,
  crawled_at   timestamptz NOT NULL DEFAULT now(),
  price        bigint,
  raw_data     text,
  region       text,
  sessions     text,        -- JSON: PostSession[]
  site         public.post_site NOT NULL,
  source_id    text        NOT NULL,
  title        text        NOT NULL,
  venue        text,
  CONSTRAINT uk_post_site_source_id UNIQUE (site, source_id)
);

CREATE INDEX post_site_idx       ON public.post (site);
CREATE INDEX post_region_idx     ON public.post (region);
CREATE INDEX post_crawled_at_idx ON public.post (crawled_at DESC);

ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_authenticated_read ON public.post
  FOR SELECT TO authenticated USING (true);

-- ── Seed data ──────────────────────────────────────
INSERT INTO public.post (crawl_job_id, site, source_id, title, region, address, venue, price, sessions) VALUES

-- SOLO_OFF
('job-seed', 'SOLO_OFF', 'so-001', '성수동 감성 카페 2:2 소개팅', '서울 성동구',
 '서울 성동구 성수일로12길 20',
 '카페 온도', 30000,
 '[{"date":"2026-07-05","time":"14:00","ratio":"2:2","status":"OPEN"},{"date":"2026-07-06","time":"15:00","ratio":"2:2","status":"OPEN"}]'),

('job-seed', 'SOLO_OFF', 'so-002', '강남 직장인 3:3 미팅파티', '서울 강남구',
 '서울 강남구 테헤란로 427',
 '루프탑바 GS', 45000,
 '[{"date":"2026-07-08","time":"19:30","ratio":"3:3","status":"OPEN"}]'),

('job-seed', 'SOLO_OFF', 'so-003', '홍대 뮤지션 2:2 소개팅', '서울 마포구',
 '서울 마포구 어울마당로 45',
 '재즈바 블루문', 28000,
 '[{"date":"2026-07-12","time":"20:00","ratio":"2:2","status":"OPEN"},{"date":"2026-07-13","time":"20:00","ratio":"2:2","status":"CLOSED"}]'),

-- LOVEMATCHING
('job-seed', 'LOVEMATCHING', 'lm-001', '이태원 루프탑 3:3 파티', '서울 용산구',
 '서울 용산구 이태원로 177',
 '라운지 베이', 50000,
 '[{"date":"2026-07-10","time":"19:00","ratio":"3:3","status":"OPEN"}]'),

('job-seed', 'LOVEMATCHING', 'lm-002', '연남동 브런치 2:2 미팅', '서울 마포구',
 '서울 마포구 연남동 228-15',
 '브런치카페 모닝', 25000,
 '[{"date":"2026-07-09","time":"11:30","ratio":"2:2","status":"OPEN"},{"date":"2026-07-11","time":"11:30","ratio":"2:2","status":"OPEN"}]'),

('job-seed', 'LOVEMATCHING', 'lm-003', '해운대 여름 4:4 파티', '부산 해운대구',
 '부산 해운대구 해운대해변로 264',
 '오션클럽 H', 60000,
 '[{"date":"2026-07-20","time":"18:00","ratio":"4:4","status":"OPEN"}]'),

-- MISEOL
('job-seed', 'MISEOL', 'ms-001', '광화문 고급 와인바 2:2', '서울 종로구',
 '서울 종로구 세종대로 175',
 '와인바 그라나', 55000,
 '[{"date":"2026-07-07","time":"20:00","ratio":"2:2","status":"OPEN"}]'),

('job-seed', 'MISEOL', 'ms-002', '판교 IT 직장인 3:3 모임', '경기 성남시',
 '경기 성남시 분당구 판교역로 166',
 '바 앤 다이닝 P', 42000,
 '[{"date":"2026-07-11","time":"19:00","ratio":"3:3","status":"OPEN"},{"date":"2026-07-18","time":"19:00","ratio":"3:3","status":"OPEN"}]'),

-- MODPARTY
('job-seed', 'MODPARTY', 'mp-001', '건대입구 게임카페 2:2 소개팅', '서울 광진구',
 '서울 광진구 능동로 90',
 '넷마블 파크', 20000,
 '[{"date":"2026-07-06","time":"15:00","ratio":"2:2","status":"OPEN"},{"date":"2026-07-13","time":"15:00","ratio":"2:2","status":"OPEN"}]'),

('job-seed', 'MODPARTY', 'mp-002', '합정 독서모임 + 소개팅 2:2', '서울 마포구',
 '서울 마포구 양화로 1',
 '책방 어떤날', 15000,
 '[{"date":"2026-07-14","time":"14:00","ratio":"2:2","status":"OPEN"}]'),

-- ORANGES
('job-seed', 'ORANGES', 'or-001', '서울숲 피크닉 3:3 소개팅', '서울 성동구',
 '서울 성동구 뚝섬로 273 서울숲',
 '서울숲 3지구', 18000,
 '[{"date":"2026-07-19","time":"13:00","ratio":"3:3","status":"OPEN"}]'),

('job-seed', 'ORANGES', 'or-002', '여의도 한강 치맥 4:4', '서울 영등포구',
 '서울 영등포구 여의동로 330',
 '한강공원 여의지구', 22000,
 '[{"date":"2026-07-05","time":"18:00","ratio":"4:4","status":"OPEN"},{"date":"2026-07-12","time":"18:00","ratio":"4:4","status":"OPEN"}]'),

-- RETURN2ME
('job-seed', 'RETURN2ME', 'r2m-001', '신촌 대학원생 2:2 소개팅', '서울 서대문구',
 '서울 서대문구 신촌로 83',
 '스터디카페 인', 20000,
 '[{"date":"2026-07-08","time":"17:00","ratio":"2:2","status":"OPEN"}]'),

-- YEONIN
('job-seed', 'YEONIN', 'yn-001', '잠실 롤러스케이팅 3:3 소개팅', '서울 송파구',
 '서울 송파구 올림픽로 25',
 '롯데월드 아이스링크', 35000,
 '[{"date":"2026-07-10","time":"16:00","ratio":"3:3","status":"OPEN"},{"date":"2026-07-17","time":"16:00","ratio":"3:3","status":"OPEN"}]'),

('job-seed', 'YEONIN', 'yn-002', '압구정 갤러리 아트 2:2', '서울 강남구',
 '서울 강남구 압구정로 60길 26',
 '갤러리 아리움', 30000,
 '[{"date":"2026-07-15","time":"14:00","ratio":"2:2","status":"OPEN"}]');
