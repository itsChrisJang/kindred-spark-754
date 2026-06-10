import { createFileRoute } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, Sparkles } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "알림 — 소개팅 AI" }],
  }),
  component: Notifications,
});

const ITEMS = [
  {
    icon: Heart,
    color: "text-pink bg-pink-light",
    title: "성수 감성 카페 소개팅",
    desc: "여성 1자리가 새로 열렸어요",
    time: "방금",
  },
  {
    icon: MessageCircle,
    color: "text-purple bg-purple-light",
    title: "AI 대화 코칭이 도착했어요",
    desc: "지난 자기소개 연습 피드백을 확인해보세요",
    time: "2시간 전",
  },
  {
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50",
    title: "이번 주 추천 모임",
    desc: "한남동 루프탑 번개에 자리가 남아있어요",
    time: "어제",
  },
];

function Notifications() {
  return (
    <PhoneShell>
      <NavHeader back title="알림" />
      <div className="scroll-area px-4 pt-2">
        <div className="space-y-2">
          {ITEMS.map(({ icon: Icon, color, title, desc, time }, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-0.5 text-xs text-text-2">{desc}</div>
                <div className="mt-1 text-[11px] text-text-3">{time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 py-4 text-text-3">
          <Bell size={20} />
          <div className="text-xs">새로운 알림이 도착하면 여기에 표시됩니다</div>
        </div>
      </div>
    </PhoneShell>
  );
}
