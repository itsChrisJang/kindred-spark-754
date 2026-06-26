## 목표

현재 `src/data/places.json`에 하드코딩된 데이트 장소 데이터를 Lovable Cloud DB로 옮겨, 코드 배포 없이 데이터를 추가·수정·삭제할 수 있게 만든다.

## 변경 사항

### 1. DB 스키마 (마이그레이션 1개)

`public.date_places` 테이블 신설.

- 컬럼: `id`(text PK, 기존 `sd-1`/`hn-1` 유지), `name`, `category`, `area`, `address`, `lat`, `lng`, `rating`(numeric), `review_count`, `price_range`, `menu_examples`(text[]), `mood`, `is_after`(bool), `reason`, `image_query`, `sort_weight`(int, 추천순용), `created_at`, `updated_at`.
- RLS ON. 정책:
  - `TO anon, authenticated` SELECT 허용 — 공개 큐레이션 데이터.
  - INSERT/UPDATE/DELETE는 정책 없음(어드민이 SQL/대시보드로 관리).
- GRANT: `SELECT TO anon, authenticated`, `ALL TO service_role`.
- `set_updated_at` 트리거 1개.
- 기존 `places.json` 60여 행을 같은 마이그레이션 안에서 `INSERT ... ON CONFLICT DO NOTHING`으로 시드.

### 2. 데이터 접근 (서버 함수)

`src/lib/places.functions.ts` 신설.

- `listPlacesFn({ area })` — 공개 read-only 서버 함수. `requireSupabaseAuth` 사용하지 않음(공개 데이터). 핸들러 안에서 publishable 키 클라이언트를 만들어 SSR 안전하게 호출. 비공개 컬럼 없음.
- DB row → `SeedPlace` 형태(camelCase)로 매핑해서 반환.

### 3. 페이지 (`src/routes/places.tsx`)

- `placesSeed` JSON import 제거.
- TanStack Query 패턴으로 전환:
  - `placesQueryOptions(area)` 정의 → 라우트 `loader`에서 `ensureQueryData`, 컴포넌트에서 `useSuspenseQuery`.
  - `area` 변경 시 새 쿼리키로 자동 refetch.
- 필터·정렬·지도 마커 로직은 그대로 유지(메모리 내).
- `errorComponent` / `notFoundComponent` 추가(현재 누락된 경우 함께 보강).

### 4. 정리

- `src/data/places.json` 삭제.
- `DatePlace` 타입에 `area`, `mood` 옵션 필드 정식 포함(이미 `SeedPlace` 확장으로 쓰던 것 흡수).

## 기술 노트

- `id`를 text로 유지하는 이유: 기존 데이터의 `sd-1`, `hn-1` 패턴을 시드 후에도 사람이 읽고 관리하기 쉬움. 신규 추가도 자유 문자열 가능.
- 공개 데이터라 `anon` SELECT를 명시적으로 허용 — 다른 user-owned 테이블과 정책 결이 다름을 RLS 정책 코멘트에 기록.
- 글쓰기 권한은 정책 없음 = 차단. 운영자 추가/수정은 추후 어드민 화면 또는 마이그레이션·`supabase--insert` 도구로 진행. (어드민 화면이 필요하면 별도 작업으로 분리)
- 이미지 매핑(`CATEGORY_IMAGES`)은 카테고리 기반 폴백이라 코드에 그대로 유지. 장소별 실사 이미지 URL을 DB에 넣고 싶다면 후속 작업으로 `image_url` 컬럼 추가.

## 영향 범위

- 변경: `src/routes/places.tsx`, `src/lib/api.ts`(타입), 새 마이그레이션, 새 `src/lib/places.functions.ts`.
- 삭제: `src/data/places.json`.
- 다른 라우트/기능에는 영향 없음.
