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
} from "./ai.functions";
import {
  createMeetingFn,
  joinMeetingFn,
  myMeetingsFn,
} from "./meetings.functions";
import { saveProfileFn, getMyProfileFn } from "./profile.functions";

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
  _rowToProfile: undefined as never,
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
};
