/**
 * 프론트엔드 API 클라이언트
 *
 * 백엔드는 별도 Kotlin 레포에서 개발됩니다. 이 파일은 두 가지 모드를 지원합니다:
 *
 * 1) VITE_API_BASE_URL 가 설정된 경우 → 실제 백엔드 HTTP 호출 (Kotlin 서버)
 * 2) 설정되지 않은 경우 (현재 데모) → localStorage 기반 영구 저장 + 시드 데이터
 *
 * AI 기능(사진 분석·대화 코칭·장소 추천)은 데모용으로 Lovable AI Gateway를
 * TanStack server function 으로 호출합니다. 실제 배포 시 Kotlin 백엔드의
 * 동일 엔드포인트로 교체하면 컴포넌트는 수정 불필요합니다.
 */

import { analyzePhotoFn, chatPracticeFn, recommendPlacesFn } from "./ai.functions";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_REMOTE = !!BASE_URL;

// ── Types (백엔드 DTO 사양) ───────────────────────────────
export type Gender = "M" | "F";

export interface Meeting {
  id: string;
  title: string;
  location: string;
  venueType: string;
  ratio: "2:2" | "3:3" | "4:4" | "5:5";
  startsAt: string; // ISO
  maleCount: number;
  femaleCount: number;
  maleCapacity: number;
  femaleCapacity: number;
  status: "OPEN" | "CLOSED";
  hostId?: string;
  hostNickname?: string;
  description?: string;
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
  photoScore?: number;
}

export interface PhotoAnalysis {
  score: number;
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
  reason?: string;
}

// ── HTTP wrapper (Kotlin 백엔드용) ────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("auth_token") : null;
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

// ── LocalStorage 영구 저장소 ──────────────────────────────
const LS = {
  TOKEN: "auth_token",
  USER: "current_user",
  PROFILE: "profile",
  MEETINGS: "meetings",
  JOINS: "joined_meetings",
  USERS: "registered_users",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// 시드 모임 데이터 (앱 첫 실행 시)
function seedMeetings(): Meeting[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: "m_seed_1",
      title: "성수 감성 카페 소개팅",
      location: "성수동",
      venueType: "카페",
      ratio: "3:3",
      startsAt: new Date(now + 5 * day).toISOString(),
      maleCount: 3,
      femaleCount: 2,
      maleCapacity: 3,
      femaleCapacity: 3,
      status: "OPEN",
      hostNickname: "민지",
      description: "성수동 분위기 좋은 카페에서 가볍게 만나요. 사진/카페 좋아하시는 분 환영!",
      aiRecommended: true,
    },
    {
      id: "m_seed_2",
      title: "한남동 루프탑 번개",
      location: "한남동",
      venueType: "루프탑바",
      ratio: "2:2",
      startsAt: new Date(now + 11 * day).toISOString(),
      maleCount: 2,
      femaleCount: 0,
      maleCapacity: 2,
      femaleCapacity: 2,
      status: "OPEN",
      hostNickname: "지훈",
      description: "한강뷰 루프탑에서 가볍게 한 잔. 와인 좋아하시는 분 환영!",
    },
    {
      id: "m_seed_3",
      title: "강남 이탈리안 디너",
      location: "강남",
      venueType: "레스토랑",
      ratio: "2:2",
      startsAt: new Date(now + 7 * day).toISOString(),
      maleCount: 1,
      femaleCount: 2,
      maleCapacity: 2,
      femaleCapacity: 2,
      status: "OPEN",
      hostNickname: "수연",
      description: "분위기 좋은 이탈리안 레스토랑에서 저녁 식사해요.",
    },
    {
      id: "m_seed_4",
      title: "홍대 클럽 소개팅",
      location: "홍대",
      venueType: "클럽",
      ratio: "4:4",
      startsAt: new Date(now - 1 * day).toISOString(),
      maleCount: 4,
      femaleCount: 4,
      maleCapacity: 4,
      femaleCapacity: 4,
      status: "CLOSED",
      hostNickname: "현우",
    },
  ];
}

function getMeetings(): Meeting[] {
  let list = load<Meeting[] | null>(LS.MEETINGS, null);
  if (!list) {
    list = seedMeetings();
    save(LS.MEETINGS, list);
  }
  return list;
}
function setMeetings(list: Meeting[]) {
  save(LS.MEETINGS, list);
}

const delay = <T,>(data: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(data), ms));

// ── 현재 사용자 컨텍스트 ─────────────────────────────────
function currentUser(): { id: string; nickname: string; email: string } | null {
  return load<{ id: string; nickname: string; email: string } | null>(LS.USER, null);
}

// ── API surface ───────────────────────────────────────────
export const api = {
  // ── Auth ─────────────────────────────────────────
  async signup(email: string, password: string, nickname: string) {
    if (USE_REMOTE)
      return request<{ token: string; user: { id: string; nickname: string; email: string } }>(
        "/api/auth/signup",
        { method: "POST", body: JSON.stringify({ email, password, nickname }) },
      );

    const users = load<Record<string, { password: string; nickname: string; id: string }>>(LS.USERS, {});
    if (users[email]) throw new Error("이미 가입된 이메일이에요");
    const id = "u_" + Date.now();
    users[email] = { password, nickname, id };
    save(LS.USERS, users);
    const token = "tok_" + id;
    const user = { id, nickname, email };
    save(LS.TOKEN, token);
    save(LS.USER, user);
    return delay({ token, user });
  },

  async login(email: string, password: string) {
    if (USE_REMOTE)
      return request<{ token: string; user: { id: string; nickname: string; email: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );

    const users = load<Record<string, { password: string; nickname: string; id: string }>>(LS.USERS, {});
    let record = users[email];
    if (!record) {
      const id = "u_" + Date.now();
      record = { password, nickname: email.split("@")[0], id };
      users[email] = record;
      save(LS.USERS, users);
    } else if (record.password !== password) {
      throw new Error("비밀번호가 일치하지 않아요");
    }
    const token = "tok_" + record.id;
    const user = { id: record.id, nickname: record.nickname, email };
    save(LS.TOKEN, token);
    save(LS.USER, user);
    return delay({ token, user });
  },

  /**
   * Google 로그인. 실제 백엔드에서는 Google ID Token 검증 후 토큰 반환.
   * Kotlin 백엔드 엔드포인트: POST /api/auth/google { idToken }
   *
   * 데모 모드에서는 가상의 Google 사용자로 로그인 처리.
   */
  async loginWithGoogle(idToken?: string) {
    if (USE_REMOTE)
      return request<{ token: string; user: { id: string; nickname: string; email: string } }>(
        "/api/auth/google",
        { method: "POST", body: JSON.stringify({ idToken: idToken ?? "demo" }) },
      );

    // 데모: 브라우저별 고유 ID 부여
    const users = load<Record<string, { password: string; nickname: string; id: string }>>(LS.USERS, {});
    let demoId = load<string>("demo_google_id", "");
    if (!demoId) {
      demoId = "g_" + Math.random().toString(36).slice(2, 10);
      save("demo_google_id", demoId);
    }
    const email = `${demoId}@google.demo`;
    let record = users[email];
    if (!record) {
      const nick = "User_" + demoId.slice(2, 6);
      record = { password: "google_oauth", nickname: nick, id: "u_" + demoId };
      users[email] = record;
      save(LS.USERS, users);
    }
    const token = "tok_" + record.id;
    const user = { id: record.id, nickname: record.nickname, email };
    save(LS.TOKEN, token);
    save(LS.USER, user);
    return delay({ token, user });
  },


  logout() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS.TOKEN);
    window.localStorage.removeItem(LS.USER);
  },

  me() {
    return currentUser();
  },

  // ── Meetings ────────────────────────────────────
  async listMeetings(filter?: { ratio?: string }): Promise<Meeting[]> {
    if (USE_REMOTE) {
      const q = filter?.ratio && filter.ratio !== "전체" ? `?ratio=${filter.ratio}` : "";
      return request<Meeting[]>(`/api/meetings${q}`);
    }
    const joins = load<string[]>(LS.JOINS, []);
    let data = getMeetings().map((m) => ({ ...m, joined: joins.includes(m.id) }));
    if (filter?.ratio && filter.ratio !== "전체")
      data = data.filter((m) => m.ratio === filter.ratio);
    // 최신 생성 우선
    data.sort((a, b) => (a.status === "CLOSED" ? 1 : -1) - (b.status === "CLOSED" ? 1 : -1));
    return delay(data);
  },

  async getMeeting(id: string): Promise<Meeting> {
    if (USE_REMOTE) return request<Meeting>(`/api/meetings/${id}`);
    const joins = load<string[]>(LS.JOINS, []);
    const m = getMeetings().find((x) => x.id === id);
    if (!m) throw new Error("모임을 찾을 수 없어요");
    return delay({ ...m, joined: joins.includes(m.id) });
  },

  async createMeeting(input: Omit<Meeting, "id" | "status" | "maleCount" | "femaleCount" | "hostId" | "hostNickname">): Promise<Meeting> {
    if (USE_REMOTE)
      return request<Meeting>("/api/meetings", { method: "POST", body: JSON.stringify(input) });
    const user = currentUser();
    const created: Meeting = {
      ...input,
      id: "m_" + Date.now(),
      status: "OPEN",
      maleCount: 0,
      femaleCount: 0,
      hostId: user?.id,
      hostNickname: user?.nickname,
    };
    const list = [created, ...getMeetings()];
    setMeetings(list);
    return delay(created);
  },

  async joinMeeting(id: string, gender: Gender): Promise<{ ok: true; meeting: Meeting }> {
    if (USE_REMOTE)
      return request<{ ok: true; meeting: Meeting }>(`/api/meetings/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ gender }),
      });
    const list = getMeetings();
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("모임을 찾을 수 없어요");
    const m = { ...list[idx] };
    if (m.status === "CLOSED") throw new Error("이미 마감된 모임이에요");
    if (gender === "M") {
      if (m.maleCount >= m.maleCapacity) throw new Error("남성 자리가 모두 찼어요");
      m.maleCount += 1;
    } else {
      if (m.femaleCount >= m.femaleCapacity) throw new Error("여성 자리가 모두 찼어요");
      m.femaleCount += 1;
    }
    if (m.maleCount >= m.maleCapacity && m.femaleCount >= m.femaleCapacity)
      m.status = "CLOSED";
    list[idx] = m;
    setMeetings(list);
    const joins = load<string[]>(LS.JOINS, []);
    if (!joins.includes(id)) {
      joins.push(id);
      save(LS.JOINS, joins);
    }
    return delay({ ok: true as const, meeting: m });
  },

  async myMeetings(): Promise<Meeting[]> {
    if (USE_REMOTE) return request<Meeting[]>("/api/meetings/mine");
    const joins = load<string[]>(LS.JOINS, []);
    const user = currentUser();
    const all = getMeetings();
    return delay(all.filter((m) => joins.includes(m.id) || m.hostId === user?.id));
  },

  // ── Profile ──────────────────────────────────────
  async saveProfile(input: Omit<UserProfile, "id" | "email">): Promise<UserProfile> {
    if (USE_REMOTE)
      return request<UserProfile>("/api/profile", { method: "PUT", body: JSON.stringify(input) });
    const user = currentUser();
    if (!user) throw new Error("로그인이 필요합니다");
    const saved: UserProfile = { ...input, id: user.id, email: user.email };
    save(LS.PROFILE, saved);
    // 사용자 닉네임도 동기화
    const updated = { ...user, nickname: input.nickname };
    save(LS.USER, updated);
    return delay(saved);
  },

  async getMyProfile(): Promise<UserProfile | null> {
    if (USE_REMOTE) {
      try {
        return await request<UserProfile>("/api/profile/me");
      } catch {
        return null;
      }
    }
    return delay(load<UserProfile | null>(LS.PROFILE, null));
  },

  // ── AI: Photo (Lovable AI Gateway 실제 호출) ────
  async analyzePhoto(imageDataUrl: string): Promise<PhotoAnalysis> {
    if (USE_REMOTE) {
      const res = await fetch(`${BASE_URL}/api/ai/photo/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (!res.ok) throw new Error("사진 분석에 실패했어요");
      return res.json();
    }
    return analyzePhotoFn({ data: { imageDataUrl } });
  },

  // ── AI: Chat practice ───────────────────────────
  async chatPractice(
    mode: "intro" | "hobby" | "smalltalk",
    message: string,
    history?: { role: "user" | "assistant"; text: string }[],
  ): Promise<ChatPracticeReply> {
    if (USE_REMOTE) {
      const res = await fetch(`${BASE_URL}/api/ai/chat/practice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message, history }),
      });
      if (!res.ok) throw new Error("대화 분석에 실패했어요");
      return res.json();
    }
    return chatPracticeFn({ data: { mode, message, history } });
  },

  // ── AI: Places ──────────────────────────────────
  async recommendPlaces(input: { area: string; category: string }): Promise<DatePlace[]> {
    if (USE_REMOTE) {
      const q = new URLSearchParams(input).toString();
      const res = await fetch(`${BASE_URL}/api/ai/places/recommend?${q}`);
      if (!res.ok) throw new Error("장소 추천에 실패했어요");
      return res.json();
    }
    const places = await recommendPlacesFn({ data: input });
    return places.map((p) => ({ ...p }));
  },
};
