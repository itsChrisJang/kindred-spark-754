/**
 * 프론트엔드 API facade
 *
 * 백엔드는 Lovable Cloud(Postgres + Auth) 단독 구성입니다.
 * - 읽기(목록/상세): 브라우저 supabase 클라이언트 직접 호출 (RLS 공개 read)
 * - 쓰기/사용자별: TanStack createServerFn + requireSupabaseAuth 미들웨어
 * - AI 기능: Lovable AI Gateway via server function (인증 사용자만)
 */

import { supabase } from "@/integrations/supabase/client";
import {
  analyzePhotoFn,
  chatPracticeFn,
  recommendPlacesFn,
  recommendLookFn,
  type LookRecommendation,
} from "./ai.functions";
import {
  createMeetingFn,
  joinMeetingFn,
  myMeetingsFn,
} from "./meetings.functions";
import { saveProfileFn, getMyProfileFn } from "./profile.functions";

// ── dev 인증 우회용 mock ──────────────────────────────────
// dev 가짜 세션(localStorage["dev-auth-bypass"]) 사용 시, auth가 필요한 AI
// 서버 함수 대신 mock을 반환한다. prod 번들에서는 import.meta.env.DEV 가드로
// 분기 자체가 트리 셰이킹되어 사라진다.
const devBypass = () =>
  import.meta.env.DEV &&
  typeof localStorage !== "undefined" &&
  localStorage.getItem("dev-auth-bypass") === "1";

const delay = <T>(value: T, ms = 1200): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

const MOCK_PHOTO_ANALYSIS: PhotoAnalysis = {
  score: 82,
  expression: 85,
  brightness: 78,
  retouchLevel: "natural",
  retouchScore: 88,
  isAiGenerated: false,
  styleScore: 74,
  styleComment: "깔끔한 셔츠가 단정한 인상을 줘요. 색을 한 톤만 밝게 가면 더 화사해 보여요.",
  compositionScore: 80,
  gazeDirection: "camera",
  framing: "bust",
  photoType: "portrait",
  suitability: "main",
  suitabilityReason: "정면 시선에 상반신 구도라 프로필 메인으로 쓰기 좋아요.",
  oneLiner: "편안한 미소가 첫인상을 부드럽게 만들어주는 사진이에요.",
  tips: [
    { type: "good", text: "자연광이 얼굴을 고르게 비춰 인상이 밝아 보여요." },
    { type: "good", text: "시선이 정면을 향해 신뢰감을 줘요." },
    { type: "improve", text: "배경이 조금 산만해요. 단색 벽 앞이면 더 깔끔해요." },
    { type: "improve", text: "상의 색이 어두워요. 밝은 톤이면 화사함이 살아요." },
  ],
};

// dev mock: 룩 추천. 입력(성별/날씨/장소/분위기)을 결과에 반영해 실제처럼 보이게 한다.
function mockLook(input: {
  gender: "M" | "F";
  weather: "sunny" | "cloudy" | "rainy";
  place: string;
  vibe: string;
}): LookRecommendation {
  const weatherLabel =
    input.weather === "sunny" ? "맑은" : input.weather === "cloudy" ? "흐린" : "비 오는";
  const genderLabel = input.gender === "M" ? "남성" : "여성";
  const outer =
    input.weather === "rainy"
      ? { category: "아우터", description: "가벼운 트렌치코트나 발수 자켓", color: "베이지" }
      : input.weather === "cloudy"
        ? { category: "아우터", description: "얇은 가디건이나 블레이저", color: "그레이" }
        : { category: "아우터", description: "선택: 얇은 셔켓 또는 생략", color: "아이보리" };

  return {
    title: `${input.vibe} ${genderLabel} 데이트 룩`,
    summary: `${weatherLabel} 날씨에 ${input.place}에서 만나기 좋은 "${input.vibe}" 무드 코디예요. 과하지 않게 포인트를 주면서 깔끔한 실루엣을 살렸어요.`,
    items: [
      input.gender === "M"
        ? { category: "상의", description: "오버핏 코튼 셔츠 또는 니트", color: "아이보리" }
        : { category: "상의", description: "부드러운 라운드넥 블라우스", color: "라이트핑크" },
      input.gender === "M"
        ? { category: "하의", description: "슬림 스트레이트 슬랙스", color: "차콜" }
        : { category: "하의", description: "A라인 미디 스커트 또는 와이드 팬츠", color: "베이지" },
      outer,
      { category: "신발", description: input.weather === "rainy" ? "방수 처리된 로퍼" : "클린한 화이트 스니커즈", color: "화이트" },
      { category: "액세서리", description: "미니멀 메탈 시계와 얇은 체인", color: "실버" },
    ],
    tips: [
      `${input.place} 조명에서는 톤 다운된 색이 차분하고 세련돼 보여요.`,
      input.weather === "rainy" ? "비 오는 날엔 밝은 아우터로 칙칙함을 덜어주세요." : "한 톤만 밝게 잡아도 화사한 인상을 줘요.",
      "전체 색은 3가지 이내로 맞추면 정돈된 느낌이 살아요.",
    ],
  };
}

// ── Types ────────────────────────────────────────────────
export type Gender = "M" | "F";
export type MeetingRatio = "2:2" | "3:3" | "4:4" | "5:5";

export type PostSite =
  | "LOVEMATCHING" | "MISEOL" | "MODPARTY"
  | "ORANGES"     | "RETURN2ME" | "SOLO_OFF" | "YEONIN";

export interface PostSession {
  date?: string;
  time?: string;
  ratio?: string;
  status?: string;
}

export interface Post {
  id: string;
  site: PostSite;
  sourceId: string;
  title: string;
  crawlJobId: string;
  crawledAt: string;
  address: string | null;
  badges: string[];
  code: string | null;
  contentText: string | null;
  couponPrice: number | null;
  datetime: string | null;
  detailUrl: string | null;
  duration: string | null;
  imageUrl: string | null;
  listPrice: number | null;
  mapLink: string | null;
  postedDate: string | null;
  price: number | null;
  promo: string | null;
  region: string | null;
  regionGroup: string | null;
  sessions: PostSession[];
  soldout: boolean;
  venue: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  location: string;
  venueType: string;
  ratio: MeetingRatio;
  startsAt: string;
  maleCount: number;
  femaleCount: number;
  maleCapacity: number;
  femaleCapacity: number;
  status: "OPEN" | "CLOSED";
  hostId?: string | null;
  hostNickname?: string | null;
  description?: string | null;
  aiRecommended?: boolean;
  joined?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  age: number;
  gender: Gender;
  bio: string;
  job?: string;
  hobbies: string[];
  photos: string[];
  preferredAgeMin: number;
  preferredAgeMax: number;
  useAgeWindow: boolean;
  ageWindowN: number;
  activeAreas: string[];
  residence?: string;
  heightSelf?: number;
  heightPref?: string;
  smoking?: string;
  drinking?: string;
  excludeSameCompany: boolean;
  rematchPrevious: boolean;
}

export interface PhotoAnalysis {
  score: number;
  expression: number;
  brightness: number;
  retouchLevel: "natural" | "moderate" | "heavy";
  retouchScore: number;
  isAiGenerated: boolean;
  styleScore: number;
  styleComment: string;
  compositionScore: number;
  gazeDirection: "camera" | "side" | "away";
  framing: "closeup" | "bust" | "fullbody" | "wide";
  photoType: "selfie" | "portrait" | "fullbody" | "group" | "scenery";
  suitability: "main" | "sub" | "replace";
  suitabilityReason: string;
  oneLiner: string;
  tips: { type: "good" | "improve"; text: string }[];
}

export interface ChatPracticeReply {
  partnerReply: string;
  feedback: string;
  good: string[];
  improve: string[];
  suggestions: string[];
}


export interface DatePlace {
  id: string;
  name: string;
  category: string;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  isAfter?: boolean;
  lat: number;
  lng: number;
  reason?: string;
  priceRange?: string;
  menuExamples?: string[];
  imageQuery?: string;
}

// ── Post helpers ─────────────────────────────────────────

type PostRow = {
  id: string; site: string; source_id: string; title: string;
  crawl_job_id: string; crawled_at: string; soldout: boolean;
  posted_date: string | null; price: number | null; list_price: number | null;
  coupon_price: number | null; region: string | null; region_group: string | null;
  code: string | null; address: string | null; badges: string | null;
  content_text: string | null; datetime: string | null; detail_url: string | null;
  duration: string | null; image_url: string | null; map_link: string | null;
  promo: string | null; sessions: string | null; venue: string | null;
};

function rowToPost(r: PostRow): Post {
  let badges: string[] = [];
  try { badges = JSON.parse(r.badges ?? "[]"); } catch {}
  let sessions: PostSession[] = [];
  try { sessions = JSON.parse(r.sessions ?? "[]"); } catch {}
  return {
    id: r.id, site: r.site as PostSite, sourceId: r.source_id, title: r.title,
    crawlJobId: r.crawl_job_id, crawledAt: r.crawled_at ?? "",
    address: r.address, badges, code: r.code, contentText: r.content_text,
    couponPrice: r.coupon_price, datetime: r.datetime, detailUrl: r.detail_url,
    duration: r.duration, imageUrl: r.image_url, listPrice: r.list_price,
    mapLink: r.map_link, postedDate: r.posted_date, price: r.price,
    promo: r.promo, region: r.region, regionGroup: r.region_group,
    sessions, soldout: r.soldout ?? false, venue: r.venue,
  };
}

// ── Helpers ──────────────────────────────────────────────
type MeetingRow = {
  id: string;
  title: string;
  location: string;
  venue_type: string;
  ratio: MeetingRatio;
  starts_at: string;
  male_capacity: number;
  female_capacity: number;
  male_count?: number | null;
  female_count?: number | null;
  status: "OPEN" | "CLOSED";
  description: string | null;
  ai_recommended: boolean;
  host_id: string | null;
  host_nickname?: string | null;
};

function rowToMeeting(r: MeetingRow, joinedIds?: Set<string>): Meeting {
  return {
    id: r.id,
    title: r.title,
    location: r.location,
    venueType: r.venue_type,
    ratio: r.ratio,
    startsAt: r.starts_at,
    maleCount: r.male_count ?? 0,
    femaleCount: r.female_count ?? 0,
    maleCapacity: r.male_capacity,
    femaleCapacity: r.female_capacity,
    status: r.status,
    description: r.description,
    aiRecommended: r.ai_recommended,
    hostId: r.host_id,
    hostNickname: r.host_nickname ?? null,
    joined: joinedIds?.has(r.id) ?? false,
  };
}

async function myJoinedIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from("meeting_participants")
    .select("meeting_id")
    .eq("user_id", user.id);
  return new Set((data ?? []).map((r) => r.meeting_id));
}


// ── API ──────────────────────────────────────────────────
export const api = {
  // Posts (Supabase) ------------------------------------
  async listPosts(filter?: { site?: PostSite; region?: string; page?: number; limit?: number }): Promise<Post[]> {
    const limit = filter?.limit ?? 50;
    const offset = ((filter?.page ?? 1) - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any).from("post").select("*").range(offset, offset + limit - 1);
    if (filter?.site) q = q.eq("site", filter.site);
    if (filter?.region) q = q.or(`region.ilike.%${filter.region}%,region_group.ilike.%${filter.region}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows: PostRow[] = data ?? [];
    return rows
      .sort((a, b) => {
        const sa = (a.image_url ? 1 : 0) + (a.price ? 1 : 0);
        const sb = (b.image_url ? 1 : 0) + (b.price ? 1 : 0);
        if (sb !== sa) return sb - sa;
        return new Date(b.crawled_at).getTime() - new Date(a.crawled_at).getTime();
      })
      .map(rowToPost);
  },

  async getPost(id: string): Promise<Post> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("post").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("공고를 찾을 수 없어요");
    return rowToPost(data as PostRow);
  },

  // Auth -------------------------------------------------
  async signOut() {
    await supabase.auth.signOut();
  },

  async currentUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  // Meetings ---------------------------------------------
  async listMeetings(filter?: { ratio?: string }): Promise<Meeting[]> {
    let q = supabase
      .from("meetings_with_counts")
      .select("*")
      .order("status", { ascending: true }) // OPEN(0) before CLOSED(1) alphabetically
      .order("starts_at", { ascending: true });
    if (filter?.ratio && filter.ratio !== "전체") {
      q = q.eq("ratio", filter.ratio as MeetingRatio);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const joined = await myJoinedIds();
    return (data as MeetingRow[]).map((r) => rowToMeeting(r, joined));
  },

  async getMeeting(id: string): Promise<Meeting> {
    const { data, error } = await supabase
      .from("meetings_with_counts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("모임을 찾을 수 없어요");
    const joined = await myJoinedIds();
    return rowToMeeting(data as MeetingRow, joined);
  },

  async createMeeting(input: {
    title: string;
    location: string;
    venueType: string;
    ratio: MeetingRatio;
    startsAt: string;
    maleCapacity: number;
    femaleCapacity: number;
    description?: string;
  }): Promise<{ id: string }> {
    return createMeetingFn({ data: input });
  },

  async joinMeeting(id: string, _gender: Gender) {
    await joinMeetingFn({ data: { meetingId: id } });
    const meeting = await api.getMeeting(id);
    return { ok: true as const, meeting };
  },

  async myMeetings(): Promise<Meeting[]> {
    const rows = await myMeetingsFn();
    const joined = await myJoinedIds();
    return (rows as MeetingRow[]).map((r) => rowToMeeting(r, joined));
  },

  // Profile ----------------------------------------------
  async saveProfile(
    input: Omit<UserProfile, "id" | "email">,
  ): Promise<UserProfile> {
    const row = await saveProfileFn({ data: input });
    const { data: { user } } = await supabase.auth.getUser();
    return rowToProfile(row, user?.email ?? "");
  },

  async getMyProfile(): Promise<UserProfile | null> {
    const row = await getMyProfileFn();
    if (!row) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return rowToProfile(row, user?.email ?? "");
  },

  // AI ---------------------------------------------------
  analyzePhoto(imageDataUrl: string): Promise<PhotoAnalysis> {
    if (devBypass()) return delay(MOCK_PHOTO_ANALYSIS);
    return analyzePhotoFn({ data: { imageDataUrl } });
  },

  chatPractice(
    mode: "intro" | "hobby" | "smalltalk",
    message: string,
    history?: { role: "user" | "assistant"; text: string }[],
  ): Promise<ChatPracticeReply> {
    return chatPracticeFn({ data: { mode, message, history } });
  },

  async recommendPlaces(input: {
    area: string;
    category: string;
    priceRange?: string;
    mood?: string;
  }): Promise<DatePlace[]> {
    return recommendPlacesFn({ data: input });
  },

  recommendLook(input: {
    gender: "M" | "F";
    weather: "sunny" | "cloudy" | "rainy";
    place: string;
    vibe: string;
  }): Promise<LookRecommendation> {
    if (devBypass()) return delay(mockLook(input));
    return recommendLookFn({ data: input });
  },
};

function rowToProfile(row: Record<string, unknown>, email: string): UserProfile {
  const r = row as {
    user_id: string; nickname: string; age: number; gender: Gender;
    job: string | null; bio: string; hobbies: string[]; photos: string[];
    preferred_age_min?: number; preferred_age_max?: number;
    use_age_window?: boolean; age_window_n?: number;
    active_areas?: string[]; residence?: string | null;
    height_self?: number | null; height_pref?: string | null;
    smoking?: string | null; drinking?: string | null;
    exclude_same_company?: boolean; rematch_previous?: boolean;
  };
  return {
    id: r.user_id, email,
    nickname: r.nickname, age: r.age, gender: r.gender,
    job: r.job ?? undefined, bio: r.bio,
    hobbies: r.hobbies, photos: r.photos,
    preferredAgeMin: r.preferred_age_min ?? 23,
    preferredAgeMax: r.preferred_age_max ?? 30,
    useAgeWindow: r.use_age_window ?? false,
    ageWindowN: r.age_window_n ?? 5,
    activeAreas: r.active_areas ?? [],
    residence: r.residence ?? undefined,
    heightSelf: r.height_self ?? undefined,
    heightPref: r.height_pref ?? undefined,
    smoking: r.smoking ?? undefined,
    drinking: r.drinking ?? undefined,
    excludeSameCompany: r.exclude_same_company ?? true,
    rematchPrevious: r.rematch_previous ?? false,
  };
}
