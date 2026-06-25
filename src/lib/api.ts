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
    return {
      id: row.user_id,
      email: user?.email ?? "",
      nickname: row.nickname,
      age: row.age,
      gender: row.gender,
      job: row.job ?? undefined,
      bio: row.bio,
      hobbies: row.hobbies,
      photos: row.photos,
    };
  },

  async getMyProfile(): Promise<UserProfile | null> {
    const row = await getMyProfileFn();
    if (!row) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return {
      id: row.user_id,
      email: user?.email ?? "",
      nickname: row.nickname,
      age: row.age,
      gender: row.gender,
      job: row.job ?? undefined,
      bio: row.bio,
      hobbies: row.hobbies,
      photos: row.photos,
    };
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
