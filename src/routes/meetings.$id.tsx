import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, MapPin, Users, Sparkles, User as UserIcon, Tag } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { MapView, AREA_COORDS } from "@/components/MapView";
import { api } from "@/lib/api";

export const Route = createFileRoute("/meetings/$id")({
  head: () => ({
    meta: [
      { title: "모임 정보 — 소개팅 AI" },
      { name: "description", content: "모임 정보를 확인하고 참여 신청하세요." },
    ],
  }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => api.getMeeting(id),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getMyProfile() });

  const join = useMutation({
    mutationFn: () => {
      if (!profile) throw new Error("먼저 프로필을 등록해주세요");
      return api.joinMeeting(id, profile.gender);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", id] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  return (
    <PhoneShell hideNav>
      <NavHeader back title={m?.title ?? "모임"} />
      <div className="scroll-area-no-nav pb-6">
        {isLoading && <div className="p-6 text-center text-sm text-text-3">불러오는 중…</div>}
        {m && (
          <>
            <div className="brand-gradient p-6 text-white">
              <h1 className="text-xl font-bold leading-tight">{m.title}</h1>
              <div className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
                {m.ratio} 매칭
              </div>
            </div>

            {/* 위치 / 카테고리 / 호스트 명확히 분리 */}
            <div className="grid grid-cols-3 gap-2 p-4">
              <Facet icon={<MapPin size={16} className="text-pink" />} label="위치" value={m.location} />
              <Facet icon={<Tag size={16} className="text-pink" />} label="카테고리" value={m.venueType} />
              <Facet icon={<UserIcon size={16} className="text-pink" />} label="호스트" value={m.hostNickname ?? "—"} />
            </div>

            <div className="space-y-3 px-4">
              <InfoRow
                icon={<Calendar size={18} className="text-pink" />}
                text={new Date(m.startsAt).toLocaleString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
              <InfoRow
                icon={<Users size={18} className="text-pink" />}
                text={`남성 ${m.maleCount}/${m.maleCapacity} · 여성 ${m.femaleCount}/${m.femaleCapacity}`}
              />
            </div>

            {m.description && (
              <div className="px-4 pt-3">
                <div className="rounded-2xl border border-border bg-surface p-4 text-sm leading-relaxed text-text-2">
                  {m.description}
                </div>
              </div>
            )}

            <div className="px-4 pt-3">
              <MapView
                lat={(AREA_COORDS[m.location] ?? AREA_COORDS["성수동"]).lat}
                lng={(AREA_COORDS[m.location] ?? AREA_COORDS["성수동"]).lng}
                zoom={15}
                height={160}
                label={`${m.location} · ${m.venueType}`}
              />
            </div>

            <div className="px-4 pt-4">
              <div className="flex items-start gap-3 rounded-2xl border border-purple/15 bg-purple-light p-3.5">
                <Sparkles size={20} className="flex-shrink-0 text-purple" />
                <div className="text-xs leading-relaxed text-purple/90">
                  참여 신청하면 채팅방이 열리고, 만남 전까지 AI 사진·대화·장소 코칭이 제공돼요.
                </div>
              </div>
            </div>

            <div className="p-4">
              {!profile && (
                <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                  먼저 프로필 탭에서 닉네임·성별을 등록해주세요.
                </div>
              )}
              {join.isError && (
                <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  {(join.error as Error).message}
                </div>
              )}
              <button
                onClick={() => join.mutate()}
                disabled={m.status === "CLOSED" || m.joined || join.isPending || !profile}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-pink text-[15px] font-semibold text-white disabled:opacity-50"
              >
                {m.status === "CLOSED"
                  ? "마감된 모임"
                  : m.joined || join.isSuccess
                    ? "참여 완료 ✓"
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

function Facet({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1 text-[11px] text-text-3">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-semibold text-foreground">{value}</div>
    </div>
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
