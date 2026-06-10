/**
 * Kotlin 백엔드용 API 클라이언트 (해커톤)
 *
 * 백엔드는 별도 레포에서 Kotlin (Spring Boot 가정)으로 개발됨.
 * 이 프론트엔드는 fetch 래퍼를 통해서만 백엔드를 호출합니다.
 *
 * 환경 변수:
 *   VITE_API_BASE_URL   예) https://api.dating-ai.example.com
 *
 * 현재는 백엔드가 없으므로 모든 함수는 mock 데이터 반환.
 * 실제 연동 시 USE_MOCK = false 로 바꾸면 fetch 호출이 활성화됩니다.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK = !BASE_URL;

// ── Types (백엔드 DTO 사양과 동일하게 유지) ────────────────
export type Gender = "M" | "F";

export interface Meeting {
  id: string;
  title: string;
  location: string;
  venueType: string; // 카페 / 레스토랑 ...
  ratio: "2:2" | "3:3" | "4:4" | "5:5";
  startsAt: string; // ISO
  maleCount: number;
  femaleCount: number;
  maleCapacity: number;
  femaleCapacity: number;
  status: "OPEN" | "CLOSED";
  aiRecommended?: boolean;
  members?: { id: string; nickname: string; gender: Gender }[];
}

export interface UserProfile {
  id: string;
  nickname: string;
  age: number;
  gender: Gender;
  bio: string;
  job?: string;
  hobbies: string[];
  photos: string[];
}

export interface PhotoAnalysis {
  score: number; // 0-100
  expression: number;
  brightness: number;
  retouchLevel: "natural" | "moderate" | "heavy";
  retouchScore: number;
  isAiGenerated: boolean;
  tips: { type: "good" | "improve"; text: string }[];
}

export interface ChatPracticeReply {
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
}

// ── HTTP wrapper ──────────────────────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── Mock data ─────────────────────────────────────────────
const MOCK_MEETINGS: Meeting[] = [
  {
    id: "m1",
    title: "성수 감성 카페 소개팅",
    location: "성수동",
    venueType: "카페",
    ratio: "3:3",
    startsAt: "2026-06-15T16:00:00+09:00",
    maleCount: 3,
    femaleCount: 2,
    maleCapacity: 3,
    femaleCapacity: 3,
    status: "OPEN",
    aiRecommended: true,
  },
  {
    id: "m2",
    title: "한남동 루프탑 번개",
    location: "한남동",
    venueType: "루프탑바",
    ratio: "2:2",
    startsAt: "2026-06-21T19:00:00+09:00",
    maleCount: 2,
    femaleCount: 0,
    maleCapacity: 2,
    femaleCapacity: 2,
    status: "OPEN",
  },
  {
    id: "m3",
    title: "홍대 클럽 소개팅",
    location: "홍대",
    venueType: "클럽",
    ratio: "4:4",
    startsAt: "2026-06-14T21:00:00+09:00",
    maleCount: 4,
    femaleCount: 4,
    maleCapacity: 4,
    femaleCapacity: 4,
    status: "CLOSED",
  },
];

const MOCK_PLACES: DatePlace[] = [
  {
    id: "p1",
    name: "어반소스 카페",
    category: "카페",
    address: "서울 성동구 성수동2가",
    distanceKm: 0.4,
    rating: 4.7,
    reviewCount: 1248,
    lat: 37.5443,
    lng: 127.0557,
  },
  {
    id: "p2",
    name: "센터커피 성수",
    category: "카페",
    address: "서울 성동구 성수일로",
    distanceKm: 0.8,
    rating: 4.5,
    reviewCount: 892,
    lat: 37.5447,
    lng: 127.054,
  },
  {
    id: "p3",
    name: "성수동 와인바",
    category: "와인바",
    address: "서울 성동구 연무장길",
    distanceKm: 1.2,
    rating: 4.6,
    reviewCount: 433,
    isAfter: true,
    lat: 37.5455,
    lng: 127.0565,
  },
];

const delay = <T,>(data: T, ms = 400) =>
  new Promise<T>((r) => setTimeout(() => r(data), ms));

// ── API surface ───────────────────────────────────────────
export const api = {
  // Auth
  async login(email: string, _password: string) {
    if (USE_MOCK) {
      const token = "mock-token-" + Date.now();
      window.localStorage.setItem("auth_token", token);
      return delay({ token, user: { id: "u1", nickname: email.split("@")[0] } });
    }
    return request<{ token: string; user: { id: string; nickname: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password: _password }) },
    );
  },

  // Meetings
  async listMeetings(filter?: { ratio?: string }) {
    if (USE_MOCK) {
      let data = MOCK_MEETINGS;
      if (filter?.ratio && filter.ratio !== "전체")
        data = data.filter((m) => m.ratio === filter.ratio);
      return delay(data);
    }
    const q = new URLSearchParams(filter as Record<string, string>).toString();
    return request<Meeting[]>(`/api/meetings?${q}`);
  },
  async getMeeting(id: string) {
    if (USE_MOCK) return delay(MOCK_MEETINGS.find((m) => m.id === id)!);
    return request<Meeting>(`/api/meetings/${id}`);
  },
  async createMeeting(input: Omit<Meeting, "id" | "status" | "maleCount" | "femaleCount">) {
    if (USE_MOCK) {
      const created: Meeting = {
        ...input,
        id: "m" + Date.now(),
        status: "OPEN",
        maleCount: 0,
        femaleCount: 0,
      };
      MOCK_MEETINGS.unshift(created);
      return delay(created);
    }
    return request<Meeting>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async joinMeeting(id: string) {
    if (USE_MOCK) return delay({ ok: true });
    return request<{ ok: true }>(`/api/meetings/${id}/join`, { method: "POST" });
  },

  // Profile
  async saveProfile(profile: Omit<UserProfile, "id">) {
    if (USE_MOCK) {
      const saved = { ...profile, id: "me" };
      window.localStorage.setItem("profile", JSON.stringify(saved));
      return delay(saved);
    }
    return request<UserProfile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  },
  async getMyProfile(): Promise<UserProfile | null> {
    if (USE_MOCK) {
      const raw = window.localStorage.getItem("profile");
      return delay(raw ? (JSON.parse(raw) as UserProfile) : null);
    }
    return request<UserProfile>("/api/profile/me");
  },

  // AI: Photo
  async analyzePhoto(_file: File): Promise<PhotoAnalysis> {
    if (USE_MOCK)
      return delay({
        score: 87,
        expression: 92,
        brightness: 78,
        retouchLevel: "natural",
        retouchScore: 88,
        isAiGenerated: false,
        tips: [
          { type: "improve", text: "배경이 약간 어두워요. 자연광이 있는 창가에서 다시 찍어보세요." },
          { type: "good", text: "표정이 자연스럽고 호감도가 높아요! 이 사진을 프로필로 쓰세요." },
        ],
      });
    const form = new FormData();
    form.append("photo", _file);
    return fetch(`${BASE_URL}/api/ai/photo/analyze`, {
      method: "POST",
      body: form,
    }).then((r) => r.json());
  },

  // AI: Chat practice
  async chatPractice(mode: "intro" | "hobby" | "smalltalk", message: string): Promise<ChatPracticeReply> {
    if (USE_MOCK)
      return delay({
        feedback: "좋은 시작이에요! 몇 가지 피드백 드릴게요.",
        good: ["취미가 구체적이라 공감대를 쉽게 형성할 수 있어요"],
        improve: ['나이 대신 "개발자로 일하고 있어요"처럼 직업을 구체적으로 말하면 더 인상적이에요'],
        suggestions: [
          "혹시 사진 찍는 거 좋아하세요? 😊",
          "오늘 날씨 정말 좋죠? 이런 날 야외 촬영 딱인데!",
          "이 근처 자주 오세요? 좋은 카페 알아요? ☕",
        ],
      });
    return request<ChatPracticeReply>("/api/ai/chat/practice", {
      method: "POST",
      body: JSON.stringify({ mode, message }),
    });
  },

  // AI: Places
  async recommendPlaces(input: { lat?: number; lng?: number; category?: string }): Promise<DatePlace[]> {
    if (USE_MOCK) {
      let data = MOCK_PLACES;
      if (input.category && input.category !== "전체")
        data = data.filter((p) => p.category === input.category);
      return delay(data);
    }
    const q = new URLSearchParams(input as Record<string, string>).toString();
    return request<DatePlace[]>(`/api/ai/places/recommend?${q}`);
  },
};
