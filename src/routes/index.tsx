import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Bell, Bookmark, ExternalLink, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api, type Post, type PostSite } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "로테이트 — 오늘의 매칭" },
      { name: "description", content: "전국 소개팅 매칭을 한 곳에서 확인하세요." },
    ],
  }),
  component: Home,
});

export const SITE_META: Record<PostSite, { label: string; color: string; bg: string }> = {
  SOLO_OFF: { label: "솔로오프", color: "#FF4B7B", bg: "#FFF0F4" },
  LOVEMATCHING: { label: "러브매칭", color: "#E85D04", bg: "#FFF4EE" },
  MISEOL: { label: "미설", color: "#7C5CFC", bg: "#F5F0FF" },
  MODPARTY: { label: "모드파티", color: "#0D6EFD", bg: "#EEF4FF" },
  ORANGES: { label: "오렌지즈", color: "#F77F00", bg: "#FFF8EE" },
  RETURN2ME: { label: "리턴투미", color: "#2D9D78", bg: "#EDFAF4" },
  YEONIN: { label: "연인", color: "#D63384", bg: "#FFF0F8" },
};

const SITES: PostSite[] = ["SOLO_OFF", "LOVEMATCHING", "MISEOL", "MODPARTY", "ORANGES", "YEONIN"];
const PAGE_SIZE = 10;
const SAVED_KEY = "saved_posts";
const ALL = "전체";

type SortMode = "fresh" | "price-low";

function Home() {
  const [activeSite, setActiveSite] = useState<PostSite | undefined>(undefined);
  const [openOnly, setOpenOnly] = useState(true);
  const [region, setRegion] = useState(ALL);
  const [sortMode, setSortMode] = useState<SortMode>("fresh");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["posts", activeSite],
      queryFn: ({ pageParam }) =>
        api.listPosts({ site: activeSite, page: pageParam as number, limit: PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined,
    });

  const posts = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);

  const regions = useMemo(() => {
    const values = posts.map((post) => getPostLocation(post)).filter(Boolean) as string[];
    return [ALL, ...Array.from(new Set(values)).slice(0, 12)];
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    return posts
      .filter((post) => {
        const postLocation = getPostLocation(post);
        const haystack = [
          post.title,
          post.region,
          post.regionGroup,
          post.venue,
          post.address,
          SITE_META[post.site].label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!openOnly || !post.soldout) &&
          (region === ALL || postLocation === region) &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      })
      .sort((a, b) => {
        const aIsSoloOff = a.site === "SOLO_OFF" ? 1 : 0;
        const bIsSoloOff = b.site === "SOLO_OFF" ? 1 : 0;
        if (aIsSoloOff !== bIsSoloOff) return aIsSoloOff - bIsSoloOff;
        if (sortMode === "price-low") return priceOf(a) - priceOf(b);
        return 0; // DB order (sort_priority ASC, crawled_at DESC) 유지
      });
  }, [debouncedQuery, openOnly, posts, region, sortMode]);

  const hasChangedFilters =
    !!activeSite || !openOnly || region !== ALL || sortMode !== "fresh" || !!query.trim();

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const resetConditions = () => {
    setActiveSite(undefined);
    setOpenOnly(true);
    setRegion(ALL);
    setSortMode("fresh");
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <PhoneShell>
      <NavHeader
        subtitle="여러 사이트의 매칭을 한곳에서"
        title="마음에 드는 매칭을 찾아보세요"
        right={
          <Link
            to="/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="알림"
          >
            <Bell size={18} />
          </Link>
        }
      />

      <div className="border-b border-border bg-surface">
        <div className="px-4 pb-3 pt-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-3">
              브랜드
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
            <FilterChip
              label="전체"
              active={!activeSite}
              color="#111"
              onClick={() => setActiveSite(undefined)}
            />
            {SITES.map((siteKey) => {
              const site = SITE_META[siteKey];
              return (
                <FilterChip
                  key={siteKey}
                  label={site.label}
                  active={activeSite === siteKey}
                  color={site.color}
                  onClick={() => setActiveSite(activeSite === siteKey ? undefined : siteKey)}
                />
              );
            })}
          </div>

          <label className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-background px-3.5">
            <Search size={16} className="text-text-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="지역, 장소, 매칭명 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
            />
          </label>

          <div className="mt-3 space-y-2">
            <div className="inline-flex h-9 w-full items-center rounded-full bg-secondary p-0.5 text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setOpenOnly(true)}
                className={`flex h-full flex-1 items-center justify-center gap-1 rounded-full transition-all ${
                  openOnly ? "bg-pink text-white shadow-sm" : "text-text-3"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${openOnly ? "bg-white" : "bg-pink"}`} />
                모집중
              </button>
              <button
                type="button"
                onClick={() => setOpenOnly(false)}
                className={`flex h-full flex-1 items-center justify-center rounded-full transition-all ${
                  !openOnly ? "bg-foreground text-white shadow-sm" : "text-text-3"
                }`}
              >
                전체보기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="지역"
                icon={<MapPin size={13} className="text-pink" />}
                value={region}
                onChange={setRegion}
                options={regions.map((value) => ({
                  value,
                  label: value === ALL ? "전체 지역" : value,
                }))}
              />
              <FilterSelect
                label="정렬"
                icon={<SlidersHorizontal size={13} className="text-pink" />}
                value={sortMode}
                onChange={(value) => setSortMode(value as SortMode)}
                options={[
                  { value: "fresh", label: "최신순" },
                  { value: "price-low", label: "낮은 가격순" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-area">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {openOnly ? "모집 중인 매칭" : "전체 매칭"}
            </div>
          </div>
          {hasChangedFilters && (
            <button
              type="button"
              onClick={resetConditions}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-text-2"
            >
              <SlidersHorizontal size={13} />
              초기화
            </button>
          )}
        </div>

        {isLoading && <MatchingSkeleton />}
        {isError && (
          <div className="mx-4 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
            매칭을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </div>
        )}
        {!isLoading && !isError && visiblePosts.length === 0 && (
          <div className="mx-4 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <div className="text-sm font-semibold text-foreground">조건에 맞는 매칭이 없어요</div>
            <div className="mt-1 text-xs text-text-3">필터를 조금 넓혀서 다시 찾아보세요.</div>
          </div>
        )}
        <div className="space-y-3 px-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        <div ref={bottomRef} className="flex h-14 items-center justify-center">
          {isFetchingNextPage && <span className="text-sm text-text-3">더 불러오는 중...</span>}
          {!hasNextPage && posts.length > 0 && (
            <span className="text-xs text-text-3">오늘 준비된 매칭을 모두 봤어요</span>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-foreground bg-foreground text-white"
          : "border-border bg-background text-text-2"
      }`}
    >
      {label !== "전체" && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: active ? "#fff" : color }}
        />
      )}
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: ReactNode;
}) {
  return (
    <label className="relative flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold text-text-3">{label}</span>
        <span className="block truncate text-[13px] font-bold text-foreground">
          {options.find((option) => option.value === value)?.label ?? "전체"}
        </span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="text-xs font-black text-text-3">⌄</span>
    </label>
  );
}

const KNOWN_LOCATIONS = [
  "강남",
  "을지로",
  "종로",
  "홍대",
  "합정",
  "신촌",
  "마포",
  "이태원",
  "한남",
  "성수",
  "잠실",
  "송파",
  "용산",
  "광화문",
  "강서",
  "노원",
  "관악",
  "동작",
  "수도권",
  "서울",
  "경기",
  "인천",
  "수원",
  "부산",
  "대구",
  "대전",
  "광주",
  "천안",
  "청주",
  "전주",
  "제주",
];

function getPostLocation(post: Post): string | null {
  if (post.regionGroup) return post.regionGroup;
  if (post.region) return post.region;
  for (const location of KNOWN_LOCATIONS) {
    if (post.title.includes(location)) return location;
  }
  return null;
}

function priceOf(post: Post) {
  return post.price ?? post.couponPrice ?? Number.MAX_SAFE_INTEGER;
}

function PostCard({ post }: { post: Post }) {
  const site = SITE_META[post.site];
  const [imgFailed, setImgFailed] = useState(false);
  const [saved, setSaved] = useState(() => isSaved(post.id));
  const handleImgError = useCallback(() => setImgFailed(true), []);
  const showImage = !!post.imageUrl && !imgFailed;
  const location = getPostLocation(post);
  const price = post.price ?? post.couponPrice;

  const toggleSaved = () => {
    const next = toggleSavedPost(post);
    setSaved(next);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {showImage ? (
        <div className="isolate relative aspect-[16/9] w-full overflow-hidden bg-secondary">
          <img
            src={post.imageUrl!}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl"
          />
          <img
            src={post.imageUrl!}
            alt={post.title}
            loading="lazy"
            className="relative z-10 h-full w-full object-contain"
            onError={handleImgError}
          />
          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
            <StatusBadge soldout={post.soldout} strong />
            <button
              type="button"
              onClick={toggleSaved}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
              aria-label={saved ? "저장 취소" : "매칭 저장"}
            >
              <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      ) : (
        <div className="h-1 w-full" style={{ backgroundColor: site.color }} />
      )}

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: site.bg, color: site.color }}
          >
            {site.label}
          </span>
          {!showImage && <StatusBadge soldout={post.soldout} strong />}
        </div>

        <h2
          className={`text-[16px] font-bold leading-snug text-foreground ${post.soldout ? "opacity-55" : ""}`}
        >
          {post.title}
        </h2>

        {post.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.badges.slice(0, 3).map((badge, index) => (
              <span
                key={`${badge}-${index}`}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: site.bg, color: site.color }}
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-text-2">
          <MetaChip icon={<MapPin size={12} />} value={location ?? "지역 확인"} />
          <MetaChip value={price != null ? `${price.toLocaleString("ko-KR")}원` : "가격 상세"} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSaved}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold ${
              saved
                ? "border-pink bg-pink-light text-pink"
                : "border-border bg-background text-text-2"
            }`}
          >
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "저장됨" : "저장"}
          </button>
          {post.detailUrl && (
            <a
              href={post.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 flex-[1.2] items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-white"
            >
              보러가기
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ soldout, strong }: { soldout: boolean; strong?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-black shadow-sm ${
        strong ? "text-[12px]" : "text-[10px]"
      } ${soldout ? "bg-gray-100 text-text-3" : "bg-pink text-white"}`}
    >
      {soldout ? "마감" : "모집중"}
    </span>
  );
}

function MetaChip({ value, icon }: { value: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold">
      {icon}
      <span className="truncate">{value}</span>
    </span>
  );
}

function MatchingSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="h-36 animate-pulse bg-secondary" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            <div className="h-5 w-full animate-pulse rounded bg-secondary" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 animate-pulse rounded-xl bg-secondary" />
              <div className="h-10 animate-pulse rounded-xl bg-secondary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function readSavedPosts() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as {
      id: string;
      site: string;
      title: string;
      price: number | null;
      imageUrl: string | null;
      detailUrl: string | null;
      soldout: boolean;
      location?: string | null;
    }[];
  } catch {
    return [];
  }
}

function isSaved(id: string) {
  return readSavedPosts().some((post) => post.id === id);
}

function toggleSavedPost(post: Post) {
  if (typeof window === "undefined") return false;
  const savedPosts = readSavedPosts();
  const exists = savedPosts.some((saved) => saved.id === post.id);
  const next = exists
    ? savedPosts.filter((saved) => saved.id !== post.id)
    : [
        {
          id: post.id,
          site: post.site,
          title: post.title,
          price: post.price ?? post.couponPrice,
          imageUrl: post.imageUrl,
          detailUrl: post.detailUrl,
          soldout: post.soldout,
          location: getPostLocation(post),
        },
        ...savedPosts,
      ];
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return !exists;
}
