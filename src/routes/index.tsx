import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Bell, MapPin } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type Post, type PostSite } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "로테이트 — 소개팅 공고" },
      { name: "description", content: "전국 소개팅/미팅 공고를 한 곳에서 확인하세요." },
    ],
  }),
  component: Home,
});

export const SITE_META: Record<PostSite, { label: string; color: string; bg: string }> = {
  SOLO_OFF:     { label: "솔로오프",   color: "#FF4B7B", bg: "#FFF0F4" },
  LOVEMATCHING: { label: "러브매칭",   color: "#E85D04", bg: "#FFF4EE" },
  MISEOL:       { label: "미소율",     color: "#7C5CFC", bg: "#F5F0FF" },
  MODPARTY:     { label: "모드파티",   color: "#0D6EFD", bg: "#EEF4FF" },
  ORANGES:      { label: "오렌지즈",   color: "#F77F00", bg: "#FFF8EE" },
  RETURN2ME:    { label: "리턴투미",   color: "#2D9D78", bg: "#EDFAF4" },
  YEONIN:       { label: "연인",       color: "#D63384", bg: "#FFF0F8" },
};

const SITES: PostSite[] = ["SOLO_OFF", "LOVEMATCHING", "MISEOL", "MODPARTY", "ORANGES", "RETURN2ME", "YEONIN"];

function Home() {
  const [activeSite, setActiveSite] = useState<PostSite | undefined>(undefined);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", activeSite],
    queryFn: () => api.listPosts(activeSite ? { site: activeSite } : undefined),
  });

  return (
    <PhoneShell>
      <NavHeader
        subtitle="오늘의 소개팅"
        title="어떤 자리가 끌리세요?"
        right={
          <Link to="/notifications" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary" aria-label="알림">
            <Bell size={18} />
          </Link>
        }
      />

      {/* 사이트 필터 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1" style={{ scrollbarWidth: "none" }}>
        <FilterChip label="전체" active={!activeSite} color="#111" bg="#f3f4f6" onClick={() => setActiveSite(undefined)} />
        {SITES.map((s) => {
          const m = SITE_META[s];
          return (
            <FilterChip
              key={s}
              label={m.label}
              active={activeSite === s}
              color={m.color}
              bg={m.bg}
              onClick={() => setActiveSite(activeSite === s ? undefined : s)}
            />
          );
        })}
      </div>

      <div className="scroll-area">
        {isLoading && <div className="py-10 text-center text-sm text-text-3">불러오는 중…</div>}
        {!isLoading && posts.length === 0 && (
          <div className="py-16 text-center text-sm text-text-3">
            {activeSite ? `${SITE_META[activeSite].label}에 등록된 공고가 없어요` : "등록된 공고가 없어요"}
          </div>
        )}
        <div className="space-y-3 px-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
        <div className="h-6" />
      </div>
    </PhoneShell>
  );
}

function FilterChip({ label, active, color, bg, onClick }: {
  label: string; active: boolean; color: string; bg: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
      style={active
        ? { background: color, borderColor: color, color: "#fff" }
        : { borderColor: "#e5e7eb", color, background: bg }
      }
    >
      {label}
    </button>
  );
}

function extractRatio(title: string): string | null {
  const m = title.match(/(\d+:\d+)/);
  return m ? m[1] : null;
}

const KNOWN_LOCATIONS = [
  '강남', '을지로', '종로', '홍대', '합정', '신촌', '마포', '이태원', '한남', '성수',
  '잠실', '송파', '용산', '광화문', '강서', '노원', '관악', '동작',
  '수도권', '서울', '경기', '인천', '수원', '부산', '대구', '대전', '광주',
  '천안', '청주', '전주', '제주',
];

function extractLocation(title: string): string | null {
  for (const loc of KNOWN_LOCATIONS) {
    if (title.includes(loc)) return loc;
  }
  return null;
}

function PostCard({ post: p }: { post: Post }) {
  const site = SITE_META[p.site];
  const [imgFailed, setImgFailed] = useState(false);
  const handleImgError = useCallback(() => setImgFailed(true), []);
  const showImage = !!p.imageUrl && !imgFailed;
  const ratio = extractRatio(p.title);
  const location = p.regionGroup ?? p.region ?? extractLocation(p.title);

  const cardClass = "block overflow-hidden rounded-2xl border border-border bg-surface";
  const content = (
    <>
      {showImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
          <img src={p.imageUrl!} alt={p.title} loading="lazy" className="h-full w-full object-cover" onError={handleImgError} />
          {p.soldout && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">마감</span>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: site.color, color: "#fff" }}>
            {site.label}
          </span>
        </div>
      )}
      <div className="p-4">
        {!showImage && (
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: site.bg, color: site.color }}>
              {site.label}
            </span>
            {p.soldout && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-text-3">마감</span>}
          </div>
        )}
        <div className={`text-[15px] font-semibold leading-snug text-foreground ${p.soldout ? "opacity-60" : ""}`}>
          {p.title}
        </div>
        {p.badges.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.badges.map((b, i) => (
              <span key={i} className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: site.bg, color: site.color }}>{b}</span>
            ))}
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {/* 모집 상태 */}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.soldout ? "bg-gray-100 text-text-3" : "bg-green-50 text-green-600"}`}>
            {p.soldout ? "마감" : "모집중"}
          </span>
          {/* 성비 */}
          {ratio && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-text-2">
              {ratio}
            </span>
          )}
          {/* 위치 */}
          {location && (
            <span className="flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-text-2">
              <MapPin size={9} />{location}
            </span>
          )}
          {/* 가격 */}
          {p.price != null && (
            <span className="ml-auto text-[13px] font-bold text-foreground">{p.price.toLocaleString("ko-KR")}원</span>
          )}
          {p.price == null && p.couponPrice != null && (
            <span className="ml-auto text-[13px] font-bold text-foreground">{p.couponPrice.toLocaleString("ko-KR")}원~</span>
          )}
        </div>
      </div>
    </>
  );

  if (p.detailUrl) {
    return <a href={p.detailUrl} target="_blank" rel="noopener noreferrer" className={cardClass}>{content}</a>;
  }
  return <div className={cardClass}>{content}</div>;
}
