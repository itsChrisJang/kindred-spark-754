import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Calendar, LogOut, User as UserIcon } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [{ title: "내 모임 — 소개팅 AI" }, { name: "description", content: "내가 참여한 소개팅 모임을 확인하세요." }],
  }),
  component: Me,
});

function Me() {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getMyProfile() });
  const { data: mine = [] } = useQuery({ queryKey: ["my-meetings"], queryFn: () => api.myMeetings() });
  const { data: user } = useQuery({ queryKey: ["auth-user"], queryFn: () => api.currentUser() });

  async function logout() {
    await api.signOut();
    location.href = "/login";
  }

  return (
    <PhoneShell>
      <NavHeader title="내 모임" right={
        <button onClick={logout} aria-label="로그아웃" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
          <LogOut size={16} />
        </button>
      } />
      <div className="scroll-area px-4 pt-2">
        <Link to="/profile" className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-mid text-pink">
            <UserIcon size={24} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{profile?.nickname ?? user?.email?.split("@")[0] ?? "사용자"}</div>
            <div className="mt-0.5 text-xs text-text-3">
              {profile ? `${profile.age}세 · ${profile.gender === "M" ? "남성" : "여성"}${profile.job ? ` · ${profile.job}` : ""}` : "프로필을 등록해주세요"}
            </div>
          </div>
          <ChevronRight size={18} className="text-text-3" />
        </Link>

        <h2 className="px-1 pb-3 text-base font-semibold">참여 중인 모임</h2>
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <Calendar size={28} className="mx-auto text-text-3" />
            <div className="mt-2 text-sm text-text-2">아직 참여한 모임이 없어요</div>
            <Link to="/" className="mt-3 inline-block text-xs font-semibold text-pink">모임 둘러보기 →</Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mine.map((m) => (
              <Link
                key={m.id}
                to="/meetings/$id"
                params={{ id: m.id }}
                className="block rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-semibold">{m.title}</div>
                    <div className="mt-0.5 text-xs text-text-3">
                      {new Date(m.startsAt).toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="tag-base bg-pink-light text-pink">{m.ratio}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-text-2">
                  <span>{m.location} · {m.venueType}</span>
                  <span className={m.status === "CLOSED" ? "text-text-3" : "text-green-600"}>
                    {m.status === "CLOSED" ? "마감" : "진행 중"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
