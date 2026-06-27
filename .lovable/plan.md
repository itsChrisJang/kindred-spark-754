## 데이트 장소 페이지 풀스크린 지도 + 바텀시트 개편

### 1. 카테고리 칩 (가로형)
- 기존 세로 [아이콘↑/라벨↓] 박스를 `[아이콘 - 라벨]` 가로 정렬로 변경
- 아이콘 14px, 라벨 16px (font-semibold), `rounded-full` pill
- 활성: `bg-pink text-white`, 비활성: `bg-surface/90` 글래스 느낌 (지도 위 플로팅)
- 좌우 스크롤 가능 (`overflow-x-auto`), 가로 패딩 16px

### 2. 풀스크린 지도 레이아웃
- 기존 `scroll-area` + 정렬바 + 작은 MapView + 카드 리스트 구조 제거
- 상단 네비/필터바 아래부터 하단 BottomNav 위까지 지도 컨테이너가 `flex-1`로 꽉 채움
- `MapView`에 `fill?: boolean` prop 추가 → true면 `height` 무시하고 `h-full w-full`로 렌더링 (border/radius 제거)
- OSM 폴백도 동일하게 fill 지원
- 지도 마커: 필터 결과(`sorted`) 전체를 표시 (현재는 5개 제한)

### 3. 카테고리 플로팅
- 카테고리 칩 줄을 지도 위 `absolute top-2 left-0 right-0 z-10`로 배치
- 좌우 fade-mask 그라데이션으로 자연스럽게 잘리도록

### 4. 드래그 가능한 바텀시트 (지도 위 오버레이)
- 상태: `collapsed` (지도 영역의 ~15%, 핸들+요약+첫 카드 peek) / `expanded` (~90%, 내부 스크롤)
- `position: absolute`, `bottom: 0`, `transform: translateY(...)`로 두 스냅 포인트 간 `transition-transform duration-300`
- 시트 헤더(핸들 + "OO곳" 텍스트) 탭 → toggle expand
- 시트 body: `overflow-y-auto`, 확장 시에만 스크롤 활성, 기존 `PlaceCard` 재사용
- "무한스크롤": 현재 데이터는 클라이언트 캐시(최대 60여 곳)이므로 페이지네이션 슬라이스(20개씩) + `IntersectionObserver`로 점진 노출 구현 (서버 백필은 변경 없음)
- 배경 스크롤 잠금은 expanded 상태에서만

### 5. 마커 선택 → 시트 필터링
- `selectedId` 상태 추가
- `MapView`에 `onPinClick?: (id) => void` prop 추가, pins에 `id` 포함하도록 타입 확장
- 마커 클릭 시: `selectedId` 설정 + 시트 expanded로 자동 전환 + 해당 장소로 지도 `panTo` (center 갱신)
- 시트 상단에 선택된 경우 `[선택된 장소명 ✕]` 칩 노출, 클릭 시 `selectedId=null`로 초기화 → 전체 목록 복귀
- 시트 데이터 소스: `selectedId ? [해당 장소] : sortedAll`

### 6. 보조 정리
- 정렬 드롭다운("추천순/평점순")은 시트 헤더 우측으로 이동
- "애프터로 추천" 섹션은 시트 내부 하단 섹션으로 통합
- `useEffect` 배경 스크롤 잠금 조건을 `sheetState === 'expanded'`로 변경
- 필터 시트(FilterSheet) 로직은 그대로 유지

### 기술 노트
- `MapView` 변경: `fill`, `onPinClick`, `pins[].id` 추가. Kakao SDK marker에 `kakao.maps.event.addListener(marker,'click', ...)` 등록. OSM 폴백에서는 onPinClick 비활성화(iframe 한계)되므로 시트 카드 클릭으로 대체 가능.
- 시트 드래그 제스처는 1차 범위에서 제외(탭 토글만). 필요 시 후속 작업.

### 작업 파일
- `src/routes/places.tsx` — 레이아웃/시트/상태 재작성
- `src/components/MapView.tsx` — `fill`, `onPinClick`, `pins[].id` 지원
