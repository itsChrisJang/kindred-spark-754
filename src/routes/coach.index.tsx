import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MessageCircle, MapPin, Shirt, Sparkles } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";

export const Route = createFileRoute("/coach/")({
  head: () => ({
    meta: [
      { title: "소개팅 준비 — 로테이트" },
      { name: "description", content: "사진, 대화, 장소, 룩까지. 소개팅 전 필요한 준비를 한곳에서 챙겨보세요." },
    ],
  }),
  component: CoachHub,
});

const ITEMS = [
  {
    to: "/coach/photo" as const,
    icon: Camera,
    title: "프로필 사진 살펴보기",
    desc: "첫인상이 어떻게 보일지 미리 확인해요",
    color: "from-pink to-pink/70",
  },
  {
    to: "/coach/chat" as const,
    icon: MessageCircle,
    title: "대화 연습",
    desc: "자기소개, 취미, 가벼운 스몰토크까지",
    color: "from-purple to-purple/70",
  },
  {
    to: "/places" as const,
    icon: MapPin,
    title: "데이트 장소 둘러보기",
    desc: "분위기 좋은 식당, 카페, 애프터 장소",
    color: "from-amber-400 to-pink",
  },
  {
    to: "/coach/look" as const,
    icon: Shirt,
    title: "오늘의 데이트 룩",
    desc: "날씨와 장소에 어울리는 코디 제안",
    color: "from-rose-400 to-purple",
  },
];

function CoachHub() {
  return (
    <PhoneShell>
      <div className="scroll-area bg-pink-light">
        <div className="px-5 pt-8 pb-5">
          <div className="text-xs font-medium text-pink">소개팅 준비</div>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground">
            만남 전, 무엇부터<br />함께 챙겨볼까요?
          </h1>
        </div>

        <div className="px-4">
          <div className="brand-gradient mb-4 rounded-3xl p-6 text-white">
            <Sparkles size={24} />
            <div className="mt-2 text-xl font-bold leading-snug">
              사진, 대화, 룩까지<br />하나씩 차근차근
            </div>
            <div className="mt-1 text-xs opacity-80">아래에서 원하는 항목을 골라주세요</div>
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
