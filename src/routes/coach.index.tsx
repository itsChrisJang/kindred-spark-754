import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MessageCircle, MapPin, Sparkles } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";

export const Route = createFileRoute("/coach/")({
  head: () => ({
    meta: [
      { title: "AI 코칭 — 소개팅 AI" },
      { name: "description", content: "사진·대화·장소까지 AI가 소개팅 전 과정을 코칭합니다." },
    ],
  }),
  component: CoachHub,
});

const ITEMS = [
  {
    to: "/coach/photo" as const,
    icon: Camera,
    title: "프로필 사진 분석",
    desc: "첫인상 점수 · 보정 정도 · AI 생성 여부",
    color: "from-pink to-pink/70",
  },
  {
    to: "/coach/chat" as const,
    icon: MessageCircle,
    title: "AI 대화 연습",
    desc: "자기소개 · 취미 · 스몰토크",
    color: "from-purple to-purple/70",
  },
  {
    to: "/places" as const,
    icon: MapPin,
    title: "데이트 장소 추천",
    desc: "거리 · 애프터 · 분위기 좋은 식당",
    color: "from-amber-400 to-pink",
  },
];

function CoachHub() {
  return (
    <PhoneShell>
      <NavHeader subtitle="AI 코칭" title="무엇을 도와드릴까요?" />
      <div className="scroll-area px-4 pt-2">
        <div className="brand-gradient mb-4 rounded-2xl p-5">
          <Sparkles size={22} />
          <div className="mt-2 text-lg font-bold leading-snug">
            만남 전, AI가 옆에서<br />하나하나 코칭해드려요
          </div>
        </div>

        <div className="space-y-2.5">
          {ITEMS.map(({ to, icon: Icon, title, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color}`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{title}</div>
                <div className="mt-0.5 text-xs text-text-3">{desc}</div>
              </div>
              <span className="text-text-3">›</span>
            </Link>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
