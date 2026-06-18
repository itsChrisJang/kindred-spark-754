# 전체 백엔드를 Lovable Cloud로 이관

현재 상태:
- 프론트: TanStack Start (완성)
- "백엔드": localStorage 데모 + 외부 Kotlin 백엔드용 HTTP 어댑터 (실제 서버 없음)
- AI: Lovable AI Gateway via server functions (이미 작동)

목표: 외부 Kotlin 백엔드를 없애고 **Lovable Cloud(DB/Auth) + TanStack server functions** 한 스택으로 통합. AI는 그대로 유지.

---

## 1. Lovable Cloud 활성화

`supabase--enable` 호출 → Postgres + Auth + Storage 자동 프로비저닝.

## 2. 데이터 모델 (마이그레이션)

```sql
-- 프로필 (auth.users와 1:1)
profiles(user_id PK→auth.users, nickname, age, gender M/F,
         job, bio, hobbies text[], photos text[], created_at)

-- 모임
meetings(id uuid PK, host_id→auth.users, title, location, venue_type,
         ratio, starts_at, male_capacity, female_capacity,
         description, status OPEN/CLOSED, created_at)

-- 참여
meeting_participants(meeting_id→meetings, user_id→auth.users,
                     gender M/F, joined_at, PK(meeting_id,user_id))
```

뷰 또는 RPC `meetings_with_counts`로 male_count/female_count 집계.

GRANT + RLS:
- profiles: 본인만 select/update, 모두 select(닉네임 공개)
- meetings: 모두 select, 인증유저 insert, host만 update
- meeting_participants: 본인 row + 같은 모임 참여자 select, 본인 insert

## 3. Auth 전환

- `/login`: 데모 Google → 실제 Lovable 브로커 `lovable.auth.signInWithOAuth("google")` + 이메일/패스워드 옵션
- `__root.tsx` AuthGate: localStorage 토큰 체크 → `supabase.auth.onAuthStateChange` 기반으로 교체
- 보호 라우트 `/me`, `/profile`, `/create`, `/coach/*`, `/meetings/*`는 `src/routes/_authenticated/` 하위로 이동 (관리형 게이트 사용)
- 공개 라우트: `/`, `/login`, `/places`

## 4. Server Functions로 백엔드 교체

`src/lib/api.ts`의 localStorage 분기를 다음으로 대체:

| 기존 api 메서드 | 새 구현 |
|---|---|
| listMeetings/getMeeting | 브라우저 supabase 클라이언트 직접 쿼리 (공개 read) |
| createMeeting | `createServerFn` + `requireSupabaseAuth` |
| joinMeeting | `createServerFn` + RPC(인원수 트랜잭션, 정원초과·중복 가드, 자동 CLOSED) |
| myMeetings | `createServerFn` + `requireSupabaseAuth` |
| saveProfile/getMyProfile | `createServerFn` + `requireSupabaseAuth` (upsert) |
| AI 3종 | **그대로 유지** (이미 server function) |

`USE_REMOTE` / Kotlin HTTP 분기 전부 삭제. `api.ts`는 얇은 facade로만 유지.

## 5. 보호 라우트 재배치

- `src/routes/_authenticated/route.tsx` (관리형, 자동 생성)
- 이동: `me.tsx`, `profile.tsx`, `create.tsx`, `coach.*.tsx`, `meetings.$id.tsx` → `_authenticated/` 하위
- `index.tsx`, `places.tsx`, `login.tsx`, `notifications.tsx`는 공개 유지 (notifications는 추후 인증 이동 가능)

## 6. 정리

- `__root.tsx`의 localStorage AuthGate 제거
- `loginWithGoogle`, `signup`, `login` 데모 로직 제거
- 시드 데이터: 마이그레이션에 `insert into meetings ...`로 4개 샘플 모임 시드

---

## 기술 메모

- AI 함수는 client→server fn 그대로. 인증 사용자만 호출하도록 `requireSupabaseAuth` 미들웨어 추가
- Google OAuth: `supabase--configure_social_auth` 호출로 활성화 + 사용자에게 Google Console redirect URI 안내
- Storage: 프로필 사진 업로드는 이번 단계 미포함 (현재도 미사용). 필요 시 다음 턴.

---

## 산출물

- 신규 마이그레이션 1개 (스키마 + RLS + GRANT + 시드 + join_meeting RPC)
- `src/lib/*.functions.ts` 5–6개 (meetings, profile)
- `src/lib/api.ts` 슬림화 (Supabase 직접 호출 + server fn 호출만)
- `src/routes/_authenticated/` 디렉토리 + 라우트 이동
- `__root.tsx` AuthGate 제거, `onAuthStateChange` 와이어링
- `login.tsx` 실제 Supabase 인증
- README 업데이트

확인사항:
1. Google 로그인 + 이메일/패스워드 둘 다 활성화 (`cloud-auth-and-security` 기본값)로 진행할까요, Google만으로 갈까요?
2. 시드 모임을 마이그레이션에 박아둘까요, 아니면 빈 DB로 시작?