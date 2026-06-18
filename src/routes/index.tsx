import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type Meeting } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "소개팅 AI — 모임 찾기" },
      {
        name: "description",
        content: "AI가 코칭하는 소개팅. 모임을 둘러보고 첫인상 사진·대화·장소까지 한번에 준비하세요.",
      },
      { property: "og:title", content: "소개팅 AI" },
      { property: "og:description", content: "AI가 코칭하는 소개팅 플랫폼" },
    ],
  }),
  component: Home,
});

// 영역별 썸네일 (Unsplash)
const AREA_THUMB: Record<string, string> = {
  성수동: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=70&auto=format&fit=crop",
  한남동: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&q=70&auto=format&fit=crop",
  강남: "https://images.unsplash.com/photo-1538485399081-7c8970d8a4f7?w=800&q=70&auto=format&fit=crop",
  홍대: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=800&q=70&auto=format&fit=crop",
  이태원: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=70&auto=format&fit=crop",
  연남동: "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=800&q=70&auto=format&fit=crop",
};
const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=70&auto=format&fit=crop";

function thumbFor(m: Meeting) {
  return AREA_THUMB[m.location] ?? FALLBACK_THUMB;
}

function Home() {
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.listMeetings(),
  });

  return (
    <PhoneShell>
      <NavHeader
        subtitle="안녕하세요"
        title="어떤 모임을 찾으세요?"
        right={
          <Link
            to="/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="알림"
          >
            <Bell size={18} />
          </Link>
        }
      />

      <div className="scroll-area">
        <Link
          to="/coach"
          className="brand-gradient relative mx-4 mt-3 block overflow-hidden rounded-2xl p-6"
        >
          <div className="text-xs opacity-80">이번 주 인기</div>
          <div className="mt-1 text-lg font-bold leading-tight">
            AI가 코칭한 소개팅<br />지금 신청해보세요
          </div>
          <span className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
            AI 코칭 시작 →
          </span>
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
        </Link>

        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h2 className="text-base font-semibold">모집 중인 모임</h2>
          <Link
            to="/create"
            className="flex items-center gap-1 rounded-full bg-pink-light px-3 py-1.5 text-xs font-semibold text-pink"
          >
            <Plus size={14} /> 모임 만들기
          </Link>
        </div>

        <div className="space-y-3 px-4">
          {isLoading && <div className="py-8 text-center text-sm text-text-3">불러오는 중…</div>}
          {meetings.map((m) => (
            <MeetingCard key={m.id} m={m} />
          ))}
        </div>
        <div className="h-6" />
      </div>
    </PhoneShell>
  );
}

function MeetingCard({ m }: { m: Meeting }) {
  const closed = m.status === "CLOSED";
  const dt = new Date(m.startsAt);
  const dateStr = `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${
    ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
  }요일 ${dt.getHours() < 12 ? "오전" : "오후"} ${((dt.getHours() + 11) % 12) + 1}시`;
  const femaleLeft = m.femaleCapacity - m.femaleCount;
  const maleLeft = m.maleCapacity - m.maleCount;

  return (
    <Link
      to="/meetings/$id"
      params={{ id: m.id }}
      className={`block overflow-hidden rounded-2xl border border-border bg-surface ${closed ? "opacity-55" : ""}`}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
        <img
          src={thumbFor(m)}
          alt={`${m.location} ${m.venueType}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute right-2 top-2">
          <span
            className={`tag-base ${
              closed
                ? "bg-black/60 text-white"
                : m.ratio === "2:2"
                  ? "bg-purple text-white"
                  : "bg-pink text-white"
            }`}
          >
            {m.ratio}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-[15px] font-semibold text-foreground">{m.title}</div>
        <div className="mt-0.5 text-xs text-text-3">{dateStr}</div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <Info label="위치" value={m.location} />
          <Info label="카테고리" value={m.venueType} />
          <Info label="호스트" value={m.hostNickname ?? "—"} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-text-3">
            남성 {m.maleCount}/{m.maleCapacity} · 여성 {m.femaleCount}/{m.femaleCapacity}
          </div>
          {closed ? (
            <span className="flex items-center gap-1 text-xs text-text-3">
              <span className="h-2 w-2 rounded-full bg-red-500" /> 마감
            </span>
          ) : femaleLeft > 0 && m.femaleCount === 0 ? (
            <span className="tag-base bg-amber-50 text-amber-600">여성 모집중</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-text-3">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {femaleLeft > 0 ? `여성 ${femaleLeft}자리` : `남성 ${maleLeft}자리`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-1.5">
      <div className="text-[10px] text-text-3">{label}</div>
      <div className="mt-0.5 truncate text-[12px] font-medium text-foreground">{value}</div>
    </div>
  );
}
