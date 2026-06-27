import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronRight, Bookmark, LogOut, User as UserIcon, ExternalLink } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api } from "@/lib/api";
import { SITE_META } from "./index";

const SAVED_KEY = "saved_posts";

export type SavedPost = {
  id: string;
  site: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  detailUrl: string | null;
  soldout: boolean;
};

export function getSavedPosts(): SavedPost[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "저장한 매칭 — 로테이트" },
      { name: "description", content: "내가 저장한 소개팅 매칭을 한눈에 확인해요." },
    ],
  }),
  component: Me,
});

function Me() {
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => api.getMyProfile() });
  const { data: user } = useQuery({ queryKey: ["auth-user"], queryFn: () => api.currentUser() });
  const [saved, setSaved] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSaved(getSavedPosts());
  }, []);

  function removeSaved(id: string) {
    const next = saved.filter((p) => p.id !== id);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSaved(next);
  }

  async function logout() {
    await api.signOut();
    location.href = "/login";
  }

  return (
    <PhoneShell>
      <NavHeader
        title="저장"
        right={
          <button
            onClick={logout}
            aria-label="로그아웃"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
          >
            <LogOut size={16} />
          </button>
        }
      />
      <div className="scroll-area px-4 pt-2">
        <Link
          to="/profile"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-mid text-pink">
            <UserIcon size={24} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold">
              {profile?.nickname ?? user?.email?.split("@")[0] ?? "사용자"}
            </div>
            <div className="mt-0.5 text-xs text-text-3">
              {profile
                ? `${profile.age}세 · ${profile.gender === "M" ? "남성" : "여성"}${profile.job ? ` · ${profile.job}` : ""}`
                : "프로필을 등록해주세요"}
            </div>
          </div>
          <ChevronRight size={18} className="text-text-3" />
        </Link>

        <div className="px-1 pb-3">
          <h2 className="text-base font-semibold">저장한 매칭</h2>
          <p className="mt-1 text-xs text-text-3">마음에 드는 매칭을 저장해두고 다시 확인하세요.</p>
        </div>
        {saved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <Bookmark size={28} className="mx-auto text-text-3" />
            <div className="mt-2 text-sm text-text-2">저장한 매칭이 없어요</div>
            <Link to="/" className="mt-3 inline-block text-xs font-semibold text-pink">
              매칭 둘러보기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {saved.map((p) => {
              const site = SITE_META[p.site as keyof typeof SITE_META];
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span
                          className="mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: site?.bg, color: site?.color }}
                        >
                          {site?.label}
                        </span>
                        <div
                          className={`text-[14px] font-semibold leading-snug ${p.soldout ? "opacity-50" : ""}`}
                        >
                          {p.title}
                        </div>
                      </div>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="h-14 w-20 flex-shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-pink-light text-[10px] font-bold text-pink">
                          매칭
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.soldout ? "bg-gray-100 text-text-3" : "bg-green-50 text-green-600"}`}
                      >
                        {p.soldout ? "마감" : "모집중"}
                      </span>
                      {p.price != null && (
                        <span className="text-[12px] font-bold text-foreground">
                          {p.price.toLocaleString("ko-KR")}원
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex border-t border-border">
                    {p.detailUrl && (
                      <a
                        href={p.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
                        style={{ color: site?.color }}
                      >
                        <ExternalLink size={12} />
                        보러가기
                      </a>
                    )}
                    <button
                      onClick={() => removeSaved(p.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-medium text-text-3"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="h-6" />
      </div>
    </PhoneShell>
  );
}
