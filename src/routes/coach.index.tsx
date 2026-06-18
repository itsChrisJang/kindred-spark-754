import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MessageCircle, MapPin, Shirt, Sparkles } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";

export const Route = createFileRoute("/coach/")({
  head: () => ({
    meta: [
      { title: "AI 코칭 — 소개팅 AI" },
      { name: "description", content: "사진·대화·장소·룩까지 AI가 소개팅 전 과정을 코칭합니다." },
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
  {
    to: "/coach/look" as const,
    icon: Shirt,
    title: "오늘 데이트 룩 추천",
    desc: "날씨·장소·취향에 맞춘 코디 제안",
    color: "from-rose-400 to-purple",
  },
];

function CoachHub() {
  return (
    <PhoneShell>
      <div className="scroll-area bg-pink-light">
        <div className="px-5 pt-8 pb-5">
          <div className="text-xs font-medium text-pink">AI 소개팅 도우미</div>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">
            만남 전, 무엇을<br />도와드릴까요?
          </h1>
        </div>

        <div className="px-4">
          <div className="brand-gradient mb-4 rounded-3xl p-6 text-white">
            <Sparkles size={24} />
            <div className="mt-2 text-xl font-bold leading-snug">
              사진부터 대화, 룩까지<br />AI가 한 번에 코칭해요
            </div>
            <div className="mt-1 text-xs opacity-80">탭하여 각 코칭을 시작하세요</div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-6">
          {ITEMS.map(({ to, icon: Icon, title, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color}`}>
                <Icon size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[16px] font-semibold">{title}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-text-3">{desc}</div>
              </div>
              <span className="text-lg text-text-3">›</span>
            </Link>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
