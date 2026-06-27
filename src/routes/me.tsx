import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bookmark, BookmarkMinus, ExternalLink, LogOut, MapPin } from "lucide-react";
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
  location?: string | null;
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
  const [saved, setSaved] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSaved(getSavedPosts());
  }, []);

  function unsavePost(id: string) {
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
        <div className="px-1 pb-3 pt-1">
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
          <div className="space-y-3">
            {saved.map((p) => {
              const site = SITE_META[p.site as keyof typeof SITE_META];
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
                >
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: site?.bg, color: site?.color }}
                          >
                            {site?.label}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              p.soldout ? "bg-gray-100 text-text-3" : "bg-pink-light text-pink"
                            }`}
                          >
                            {p.soldout ? "마감" : "모집중"}
                          </span>
                        </div>
                        <div
                          className={`line-clamp-2 text-[15px] font-bold leading-snug text-foreground ${p.soldout ? "opacity-50" : ""}`}
                        >
                          {p.title}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {p.location && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold text-text-2">
                              <MapPin size={12} />
                              {p.location}
                            </span>
                          )}
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold text-text-2">
                            {p.price != null ? `${p.price.toLocaleString("ko-KR")}원` : "가격 상세"}
                          </span>
                        </div>
                      </div>
                      {p.imageUrl ? (
                        <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className="flex h-20 w-24 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold"
                          style={{ background: site?.bg, color: site?.color }}
                        >
                          {site?.label ?? "매칭"}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {p.detailUrl && (
                        <a
                          href={p.detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 flex-[1.15] items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-white"
                        >
                          보러가기
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => unsavePost(p.id)}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-sm font-semibold text-text-2"
                      >
                        <BookmarkMinus size={15} />
                        저장 해제
                      </button>
                    </div>
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
