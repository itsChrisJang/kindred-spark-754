import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Users } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/meetings/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `모임 #${params.id} — 소개팅 AI` },
      { name: "description", content: "모임 상세 정보를 확인하고 참여 신청하세요." },
    ],
  }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => api.getMeeting(id),
  });
  const join = useMutation({ mutationFn: () => api.joinMeeting(id) });

  return (
    <PhoneShell hideNav>
      <NavHeader back title="모임 상세" />
      <div className="scroll-area-no-nav">
        {isLoading && <div className="p-6 text-center text-sm text-text-3">불러오는 중…</div>}
        {m && (
          <>
            <div className="brand-gradient p-6 text-white">
              <div className="text-xs opacity-80">{m.location} · {m.venueType}</div>
              <h1 className="mt-1 text-xl font-bold">{m.title}</h1>
              <div className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
                {m.ratio} 매칭
              </div>
            </div>

            <div className="space-y-3 p-4">
              <InfoRow icon={<Calendar size={18} className="text-pink" />} text={new Date(m.startsAt).toLocaleString("ko-KR")} />
              <InfoRow icon={<MapPin size={18} className="text-pink" />} text={`${m.location} 일대`} />
              <InfoRow
                icon={<Users size={18} className="text-pink" />}
                text={`남성 ${m.maleCount}/${m.maleCapacity} · 여성 ${m.femaleCount}/${m.femaleCapacity}`}
              />
            </div>

            <div className="px-4 pt-2">
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-2 leading-relaxed">
                AI 분위기 점수와 장소 접근성을 기준으로 추천된 모임이에요. 참여하면 채팅방이 열리고
                만남 전까지 AI 코칭이 제공됩니다.
              </div>
            </div>

            <div className="p-4 pb-8">
              <button
                onClick={() => join.mutate()}
                disabled={m.status === "CLOSED" || join.isPending}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {m.status === "CLOSED"
                  ? "마감된 모임"
                  : join.isSuccess
                    ? "신청 완료 ✓"
                    : join.isPending
                      ? "신청 중…"
                      : "신청하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      {icon}
      <div className="text-sm">{text}</div>
    </div>
  );
}
