
-- ============ ENUMS ============
CREATE TYPE public.gender AS ENUM ('M', 'F');
CREATE TYPE public.meeting_ratio AS ENUM ('2:2', '3:3', '4:4', '5:5');
CREATE TYPE public.meeting_status AS ENUM ('OPEN', 'CLOSED');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age BETWEEN 19 AND 100),
  gender public.gender NOT NULL,
  job TEXT,
  bio TEXT NOT NULL DEFAULT '',
  hobbies TEXT[] NOT NULL DEFAULT '{}',
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_self_delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ MEETINGS ============
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  ratio public.meeting_ratio NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  male_capacity INTEGER NOT NULL CHECK (male_capacity BETWEEN 1 AND 10),
  female_capacity INTEGER NOT NULL CHECK (female_capacity BETWEEN 1 AND 10),
  description TEXT,
  status public.meeting_status NOT NULL DEFAULT 'OPEN',
  ai_recommended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX meetings_starts_at_idx ON public.meetings (starts_at DESC);
CREATE INDEX meetings_status_idx ON public.meetings (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT SELECT ON public.meetings TO anon;
GRANT ALL ON public.meetings TO service_role;

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_public_read" ON public.meetings FOR SELECT USING (true);
CREATE POLICY "meetings_authenticated_insert" ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "meetings_host_update" ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "meetings_host_delete" ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ MEETING_PARTICIPANTS ============
CREATE TABLE public.meeting_participants (
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gender public.gender NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX meeting_participants_user_idx ON public.meeting_participants (user_id);

GRANT SELECT, INSERT, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_participants TO anon;
GRANT ALL ON public.meeting_participants TO service_role;

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- 모임의 참여자 수는 공개 (집계용)
CREATE POLICY "participants_public_read" ON public.meeting_participants FOR SELECT USING (true);
CREATE POLICY "participants_self_insert" ON public.meeting_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants_self_delete" ON public.meeting_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ VIEW with counts ============
CREATE OR REPLACE VIEW public.meetings_with_counts
WITH (security_invoker = true)
AS
SELECT
  m.*,
  COALESCE(SUM(CASE WHEN p.gender = 'M' THEN 1 ELSE 0 END), 0)::int AS male_count,
  COALESCE(SUM(CASE WHEN p.gender = 'F' THEN 1 ELSE 0 END), 0)::int AS female_count,
  pr.nickname AS host_nickname
FROM public.meetings m
LEFT JOIN public.meeting_participants p ON p.meeting_id = m.id
LEFT JOIN public.profiles pr ON pr.user_id = m.host_id
GROUP BY m.id, pr.nickname;

GRANT SELECT ON public.meetings_with_counts TO anon, authenticated;

-- ============ RPC: join_meeting (atomic) ============
CREATE OR REPLACE FUNCTION public.join_meeting(_meeting_id UUID)
RETURNS public.meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user UUID := auth.uid();
  _gender public.gender;
  _m public.meetings;
  _male INT;
  _female INT;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다';
  END IF;

  SELECT gender INTO _gender FROM public.profiles WHERE user_id = _user;
  IF _gender IS NULL THEN
    RAISE EXCEPTION '먼저 프로필을 등록해주세요';
  END IF;

  SELECT * INTO _m FROM public.meetings WHERE id = _meeting_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '모임을 찾을 수 없어요';
  END IF;

  IF _m.status = 'CLOSED' THEN
    RAISE EXCEPTION '이미 마감된 모임이에요';
  END IF;

  IF EXISTS (SELECT 1 FROM public.meeting_participants WHERE meeting_id = _meeting_id AND user_id = _user) THEN
    RAISE EXCEPTION '이미 참여 중인 모임이에요';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN gender = 'M' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN gender = 'F' THEN 1 ELSE 0 END), 0)
  INTO _male, _female
  FROM public.meeting_participants WHERE meeting_id = _meeting_id;

  IF _gender = 'M' AND _male >= _m.male_capacity THEN
    RAISE EXCEPTION '남성 자리가 모두 찼어요';
  ELSIF _gender = 'F' AND _female >= _m.female_capacity THEN
    RAISE EXCEPTION '여성 자리가 모두 찼어요';
  END IF;

  INSERT INTO public.meeting_participants (meeting_id, user_id, gender)
  VALUES (_meeting_id, _user, _gender);

  IF _gender = 'M' THEN _male := _male + 1; ELSE _female := _female + 1; END IF;

  IF _male >= _m.male_capacity AND _female >= _m.female_capacity THEN
    UPDATE public.meetings SET status = 'CLOSED' WHERE id = _meeting_id RETURNING * INTO _m;
  END IF;

  RETURN _m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_meeting(UUID) TO authenticated;

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED MEETINGS (hostless demo) ============
INSERT INTO public.meetings (title, location, venue_type, ratio, starts_at, male_capacity, female_capacity, description, status, ai_recommended)
VALUES
  ('성수 감성 카페 소개팅', '성수동', '카페', '3:3', now() + interval '5 days', 3, 3, '성수동 분위기 좋은 카페에서 가볍게 만나요. 사진/카페 좋아하시는 분 환영!', 'OPEN', true),
  ('한남동 루프탑 번개', '한남동', '루프탑바', '2:2', now() + interval '11 days', 2, 2, '한강뷰 루프탑에서 가볍게 한 잔. 와인 좋아하시는 분 환영!', 'OPEN', false),
  ('강남 이탈리안 디너', '강남', '레스토랑', '2:2', now() + interval '7 days', 2, 2, '분위기 좋은 이탈리안 레스토랑에서 저녁 식사해요.', 'OPEN', false),
  ('홍대 클럽 소개팅', '홍대', '클럽', '4:4', now() - interval '1 day', 4, 4, NULL, 'CLOSED', false);
