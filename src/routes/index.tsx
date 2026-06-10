import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
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

const RATIOS = ["전체", "2:2", "3:3", "4:4"];

function Home() {
  const [ratio, setRatio] = useState("전체");
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", ratio],
    queryFn: () => api.listMeetings({ ratio }),
  });

  return (
    <PhoneShell>
      <NavHeader
        subtitle="안녕하세요 👋"
        title="어떤 모임을 찾으세요?"
        right={
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary" aria-label="알림">
            <Bell size={18} />
          </button>
        }
      />

      <div className="scroll-area">
        {/* Hero */}
        <div className="brand-gradient relative mx-4 mt-3 overflow-hidden rounded-2xl p-6">
          <div className="text-xs opacity-80">이번 주 인기</div>
          <div className="mt-1 text-lg font-bold leading-tight">
            AI가 코칭한 소개팅<br />지금 신청해보세요
          </div>
          <span className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
            모임 보러가기 →
          </span>
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-4">
          {RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => setRatio(r)}
              className={`pill ${ratio === r ? "pill-active" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>

        <h2 className="px-4 pt-5 pb-3 text-base font-semibold">모집 중인 모임</h2>

        <div className="space-y-2.5 px-4">
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
      className={`block rounded-2xl border border-border bg-surface p-4 ${closed ? "opacity-55" : ""}`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold text-foreground">{m.title}</div>
          <div className="mt-0.5 text-xs text-text-3">{dateStr}</div>
        </div>
        <span
          className={`tag-base ${
            closed
              ? "bg-secondary text-text-3"
              : m.ratio === "2:2"
                ? "bg-purple-light text-purple"
                : "bg-pink-light text-pink"
          }`}
        >
          {m.ratio}
        </span>
      </div>
      <div className="mb-3 flex gap-1.5">
        <span className="tag-base bg-secondary text-text-2">📍 {m.location}</span>
        <span className="tag-base bg-secondary text-text-2">{venueIcon(m.venueType)} {m.venueType}</span>
      </div>
      <div className="flex items-center justify-between">
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
    </Link>
  );
}

function venueIcon(v: string) {
  if (v.includes("카페")) return "☕";
  if (v.includes("바") || v.includes("와인")) return "🍷";
  if (v.includes("클럽")) return "🎵";
  if (v.includes("레스토랑")) return "🍽️";
  return "📍";
}
