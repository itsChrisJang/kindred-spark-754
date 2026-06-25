
# 대화 연습 화면 개선 계획

`src/routes/coach.chat.tsx` 파일만 수정합니다.

## 1. 레이아웃: 헤더 / 입력창 fixed, 가운데만 스크롤

현재는 `NavHeader`와 모드 탭이 일반 흐름에 있고 입력창만 `fixed`라 스크롤 영역이 모호합니다.

- `PhoneShell` 안을 flex column 구조로 잡고
  - **상단 영역(고정)**: `NavHeader` + 모드 탭(자기소개/취미/스몰토크) — `flex-shrink-0 sticky top-0 z-10 bg-surface`
  - **중간 영역(스크롤)**: 메시지 리스트 — `flex-1 overflow-y-auto` (자체 스크롤). 기존 `.scroll-area-no-nav` 대신 컨테이너 내부 스크롤로 변경
  - **하단 영역(고정)**: 입력창 — 기존 `fixed bottom-0` 유지하되 모바일 셸 폭(`max-w-[420px]`)에 맞춤
- 스크롤 컨테이너에 `ref`를 달아 직접 제어
- 상·하 고정 영역 높이만큼 중간 영역에 `padding`은 불필요(flex로 분할되므로)

## 2. 전송 즉시 내 메시지 반영 + AI "..." 로딩 애니메이션

현재는 `onSuccess`에서 내 메시지와 AI 응답을 한꺼번에 추가해, 응답이 오기 전까지 내 말풍선이 보이지 않습니다.

- `send.mutate` 직전에 내 메시지를 `messages` 상태에 push (옵티미스틱)
- 응답 대기 동안 AI 말풍선 자리에 로딩 버블 렌더링
  - 점이 `.` → `..` → `...` → `.` 순으로 순환하는 작은 컴포넌트 `TypingDots` 추가
  - `setInterval` 400ms 주기로 상태(0/1/2) 토글, `send.isPending`일 때만 노출
- `onSuccess`에서는 AI 응답만 append (내 메시지는 이미 들어있음)
- `onError` 시 옵티미스틱 메시지 롤백 또는 에러 버블 표시

## 3. AI 응답 도착 시 자동 스크롤 하단 이동

- 스크롤 컨테이너 `ref`를 활용해 다음 시점에 `scrollTop = scrollHeight` 실행:
  - 메시지 추가 시 (`messages.length` 변화)
  - 전송 직후(내 메시지 옵티미스틱 반영)
  - AI 응답 도착(`send.isSuccess`) 후 — 분석 카드/제안 카드 렌더 완료 보장을 위해 `requestAnimationFrame` 1~2회 후 스크롤
- `useEffect`로 처리, 매끄럽게 `behavior: "smooth"`

## 기술 메모

- 새 컴포넌트: `TypingDots`(파일 내 로컬), `messagesRef`(HTMLDivElement)
- 추가 의존성 없음
- `PhoneShell hideNav`는 유지(키보드/입력창과 하단 nav 중복 방지)
- 모드 전환 시에도 스크롤 맨 아래로 이동
