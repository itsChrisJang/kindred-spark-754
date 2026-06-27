import { createFileRoute } from "@tanstack/react-router";
import {
  MapPin,
  Search,
  Star,
  ExternalLink,
  Utensils,
  SlidersHorizontal,
  X,
  Coffee,
  Wine,
  Sparkles,
  Music,
  ArrowUpDown,
  Check,
  RotateCcw,
  Phone,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { MapView, AREA_COORDS } from "@/components/MapView";
import { listPlacesFn, type SeedPlace } from "@/lib/places.functions";

const placesQueryOptions = (area: string) =>
  queryOptions({
    queryKey: ["date_places", area],
    queryFn: () => listPlacesFn({ data: { area } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/places")({
  head: () => ({
    meta: [
      { title: "데이트 장소 — 로테이트" },
      { name: "description", content: "동네, 분위기, 예산에 맞는 데이트 장소를 골라보세요." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(placesQueryOptions("성수동")),
  errorComponent: ({ error }) => (
    <PhoneShell>
      <NavHeader back title="데이트 장소" />
      <div className="p-6 text-sm text-text-2">불러오기 실패: {error.message}</div>
    </PhoneShell>
  ),
  notFoundComponent: () => (
    <PhoneShell>
      <NavHeader back title="데이트 장소" />
      <div className="p-6 text-sm text-text-2">장소가 없어요.</div>
    </PhoneShell>
  ),
  component: Places,
});


const CATEGORIES = [
  { value: "전체", icon: Sparkles },
  { value: "카페", icon: Coffee },
  { value: "레스토랑", icon: Utensils },
  { value: "와인바", icon: Wine },
  { value: "액티비티", icon: Music },
] as const;
const AREAS = ["성수동", "한남동", "강남", "홍대", "이태원", "연남동"];
const PRICE = ["전체", "1만원 이하", "1만~3만원", "3만~5만원", "5만원 이상"];
const MOOD = ["전체", "조용함", "감성적", "활기참", "프라이빗"];
const SORT = [
  { value: "추천순", label: "추천순" },
  { value: "평점순", label: "평점 높은순" },
] as const;
type Sort = (typeof SORT)[number]["value"];

function kakaoMapSearchUrl(name: string, address: string) {
  const q = encodeURIComponent(`${name} ${address}`);
  return `https://map.kakao.com/?q=${q}`;
}
function kakaoMapRouteUrl(p: {
  kakaoPlaceId?: string;
  name: string;
  lat: number;
  lng: number;
}) {
  if (p.kakaoPlaceId) {
    return `https://map.kakao.com/link/to/${p.kakaoPlaceId}`;
  }
  return `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
}

const CATEGORY_IMAGES: Record<string, string[]> = {
  카페: [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=70",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=70",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=70",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&q=70",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&q=70",
  ],
  레스토랑: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=70",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=70",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=70",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=70",
    "https://images.unsplash.com/photo-1592861956120-e524fc739696?w=600&q=70",
  ],
  와인바: [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=70",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&q=70",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=70",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=70",
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=600&q=70",
  ],
  액티비티: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=70",
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=70",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=70",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=70",
    "https://images.unsplash.com/photo-1545048702-79362596cdc9?w=600&q=70",
  ],
};

function placeImage(p: SeedPlace) {
  const pool = CATEGORY_IMAGES[p.category] ?? CATEGORY_IMAGES.카페;
  const hash = [...p.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[hash % pool.length];
}

const PAGE_SIZE = 20;

function Places() {
  const [cat, setCat] = useState("전체");
  const [area, setArea] = useState("성수동");
  const [price, setPrice] = useState("전체");
  const [mood, setMood] = useState("전체");
  const [sort, setSort] = useState<Sort>("추천순");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sheetState, setSheetState] = useState<"collapsed" | "expanded">("collapsed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: places } = useSuspenseQuery(placesQueryOptions(area));

  const filtered = useMemo(() => {
    return (places as SeedPlace[])
      .filter((p) => cat === "전체" || p.category === cat)
      .filter((p) => price === "전체" || p.priceRange === price)
      .filter((p) => mood === "전체" || p.mood === mood);
  }, [places, cat, price, mood]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "평점순") return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    });
  }, [filtered, sort]);

  const selectedPlace = useMemo(
    () => (selectedId ? sorted.find((p) => p.id === selectedId) ?? null : null),
    [selectedId, sorted],
  );
  const listData = selectedPlace ? [selectedPlace] : sorted;
  const visibleList = listData.slice(0, visibleCount);

  // 필터/지역 변경 시 페이지네이션 리셋
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelectedId(null);
  }, [area, cat, price, mood, sort]);

  const activeCount =
    (cat !== "전체" ? 1 : 0) + (price !== "전체" ? 1 : 0) + (mood !== "전체" ? 1 : 0);

  const activeChips: { key: string; label: string; reset: () => void }[] = [];
  if (cat !== "전체") activeChips.push({ key: "cat", label: cat, reset: () => setCat("전체") });
  if (price !== "전체")
    activeChips.push({ key: "price", label: price, reset: () => setPrice("전체") });
  if (mood !== "전체") activeChips.push({ key: "mood", label: mood, reset: () => setMood("전체") });

  const resetAll = () => {
    setCat("전체");
    setPrice("전체");
    setMood("전체");
  };

  // 시트가 확장됐을 때만 배경 스크롤 잠금
  useEffect(() => {
    if (sheetState !== "expanded") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetState]);

  // 마커 클릭 → 시트 확장 + 해당 장소 단독 표시
  const handlePinClick = (id: string) => {
    setSelectedId(id);
    setSheetState("expanded");
    setVisibleCount(PAGE_SIZE);
  };

  // 무한 스크롤 (sentinel observer)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (sheetState !== "expanded") return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, listData.length));
        }
      },
      { root: el.closest("[data-sheet-scroll]"), rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sheetState, listData.length]);

  const center = selectedPlace
    ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
    : AREA_COORDS[area] ?? AREA_COORDS["성수동"];

  const pins = sorted.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name }));

  // 헤더 + 필터바 실제 높이 → CSS 변수로 노출 (지도 높이 계산용)
  const headerRef = useRef<HTMLDivElement | null>(null);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = headerRef.current;
    const wrap = mapWrapRef.current;
    if (!el || !wrap) return;
    const ro = new ResizeObserver(() => {
      wrap.style.setProperty("--places-header", `${el.offsetHeight}px`);
    });
    ro.observe(el);
    wrap.style.setProperty("--places-header", `${el.offsetHeight}px`);
    return () => ro.disconnect();
  }, []);

  return (
    <PhoneShell>
      <div ref={headerRef} className="z-20 flex-shrink-0 bg-surface">
        <NavHeader back title="데이트 장소" />

        {/* Pinned filter bar */}
        <div className="border-b border-border bg-surface">
          <div className="flex items-center gap-2 px-4 py-2.5">
            {/* 지역 선택 */}
            <div className="relative">
              <button
                onClick={() => {
                  setAreaOpen((v) => !v);
                  setSortOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
              >
                <MapPin size={14} className="text-pink" />
                {area}
              </button>
              {areaOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setAreaOpen(false)}
                  />
                  <div className="absolute left-0 top-full z-40 mt-1.5 w-32 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                    {AREAS.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setArea(a);
                          setAreaOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                          a === area ? "bg-pink-light text-pink font-semibold" : "hover:bg-secondary"
                        }`}
                      >
                        {a}
                        {a === area && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 검색바 (placeholder) */}
            <div className="flex flex-1 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-text-3">
              <Search size={14} />
              <span className="truncate">{sorted.length}곳 추천중</span>
            </div>

            {/* 필터 버튼 */}
            <button
              onClick={() => setSheetOpen(true)}
              className="relative flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
            >
              <SlidersHorizontal size={14} />
              필터
              {activeCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* 활성 필터 칩 */}
          {activeChips.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2.5">
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.reset}
                  className="flex flex-shrink-0 items-center gap-1 rounded-full bg-pink-light px-2.5 py-1 text-xs font-semibold text-pink"
                >
                  {c.label}
                  <X size={11} />
                </button>
              ))}
              <button
                onClick={resetAll}
                className="flex flex-shrink-0 items-center gap-0.5 px-1 text-xs text-text-3 underline-offset-2 hover:underline"
              >
                <RotateCcw size={11} />
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 지도 영역 — 헤더/필터/BottomNav 제외한 전체 영역 채움 */}
      <div
        className="relative w-full"
        style={{ height: "calc(100dvh - var(--places-header, 105px) - 68px)", minHeight: 360 }}
      >

        <MapView
          fill
          lat={center.lat}
          lng={center.lng}
          zoom={selectedPlace ? 3 : 5}
          pins={pins}
          onPinClick={handlePinClick}
        />

        {/* 카테고리 플로팅 칩 */}
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto px-3 [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map(({ value, icon: Icon }) => {
              const active = value === cat;
              return (
                <button
                  key={value}
                  onClick={() => setCat(value)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 shadow-sm transition-all ${
                    active
                      ? "border-pink bg-pink text-white"
                      : "border-border bg-surface/95 text-foreground backdrop-blur"
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-[16px] font-semibold leading-none">{value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 바텀시트 */}
        <SheetOverlay
          state={sheetState}
          onToggle={() => setSheetState((s) => (s === "expanded" ? "collapsed" : "expanded"))}
          selectedPlace={selectedPlace}
          onClearSelection={() => setSelectedId(null)}
          totalCount={listData.length}
          sort={sort}
          onSortChange={setSort}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
        >
          <div data-sheet-scroll className="h-full overflow-y-auto px-4 pb-6 pt-3">
            {visibleList.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border py-10 text-center">
                <div className="text-sm font-semibold">조건에 맞는 장소가 없어요</div>
                <div className="mt-1 text-xs text-text-3">필터를 조정해보세요</div>
                <button
                  onClick={resetAll}
                  className="mt-3 rounded-full bg-pink-light px-4 py-1.5 text-xs font-semibold text-pink"
                >
                  필터 초기화
                </button>
              </div>
            )}
            <div className="space-y-3">
              {visibleList.map((p) => (
                <PlaceCard key={p.id} p={p} />
              ))}
            </div>
            {visibleCount < listData.length && (
              <div ref={sentinelRef} className="py-4 text-center text-xs text-text-3">
                불러오는 중…
              </div>
            )}
          </div>
        </SheetOverlay>
      </div>

      {/* Filter Bottom Sheet */}
      {sheetOpen && (
        <FilterSheet
          price={price}
          mood={mood}
          onChange={(p, m) => {
            setPrice(p);
            setMood(m);
          }}
          onClose={() => setSheetOpen(false)}
          onReset={() => {
            setPrice("전체");
            setMood("전체");
          }}
        />
      )}
    </PhoneShell>
  );
}

function SheetOverlay({
  state,
  onToggle,
  selectedPlace,
  onClearSelection,
  totalCount,
  sort,
  onSortChange,
  sortOpen,
  setSortOpen,
  children,
}: {
  state: "collapsed" | "expanded";
  onToggle: () => void;
  selectedPlace: SeedPlace | null;
  onClearSelection: () => void;
  totalCount: number;
  sort: Sort;
  onSortChange: (s: Sort) => void;
  sortOpen: boolean;
  setSortOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  // collapsed: 지도 영역의 ~15%만 차지 (헤더만 보임)
  // expanded: 90% 차지 (지도 위 10% 남김)
  const heightPct = state === "expanded" ? 90 : 15;
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.18)] transition-[height] duration-300 ease-out"
      style={{ height: `${heightPct}%` }}
    >
      {/* 헤더 (탭하면 토글) */}
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-shrink-0 flex-col items-stretch gap-1.5 px-4 pb-2 pt-2 text-left"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            {selectedPlace ? selectedPlace.name : `${totalCount}곳`}
            {!selectedPlace && (
              <span className="ml-1 text-xs font-normal text-text-3">
                {state === "expanded" ? "탭해서 접기" : "위로 올려보기"}
              </span>
            )}
          </div>
          {selectedPlace ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              className="flex items-center gap-1 rounded-full bg-pink-light px-2.5 py-1 text-xs font-semibold text-pink"
            >
              선택 취소
              <X size={11} />
            </span>
          ) : (
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1 text-xs font-semibold text-text-2"
              >
                <ArrowUpDown size={12} />
                {SORT.find((s) => s.value === sort)?.label}
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1.5 w-32 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                    {SORT.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          onSortChange(s.value);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                          s.value === sort
                            ? "bg-pink-light text-pink font-semibold"
                            : "hover:bg-secondary"
                        }`}
                      >
                        {s.label}
                        {s.value === sort && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </button>

      {/* 본문 */}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}


function FilterSheet({
  price,
  mood,
  onChange,
  onClose,
  onReset,
}: {
  price: string;
  mood: string;
  onChange: (price: string, mood: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [localPrice, setLocalPrice] = useState(price);
  const [localMood, setLocalMood] = useState(mood);

  const apply = () => {
    onChange(localPrice, localMood);
    onClose();
  };
  const reset = () => {
    setLocalPrice("전체");
    setLocalMood("전체");
    onReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[440px] animate-in slide-in-from-bottom rounded-t-3xl bg-surface pb-6 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-4">
          <button onClick={reset} className="flex items-center gap-1 text-sm text-text-3">
            <RotateCcw size={13} />
            초기화
          </button>
          <div className="text-base font-semibold">상세 필터</div>
          <button onClick={onClose} className="text-text-3">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5">
          <SheetSection title="가격대" hint="1인 기준 예상 비용">
            <div className="grid grid-cols-2 gap-2">
              {PRICE.map((p) => (
                <ChoiceCard
                  key={p}
                  active={p === localPrice}
                  onClick={() => setLocalPrice(p)}
                  label={p}
                />
              ))}
            </div>
          </SheetSection>

          <SheetSection title="분위기" hint="원하는 무드를 골라주세요">
            <div className="grid grid-cols-2 gap-2">
              {MOOD.map((m) => (
                <ChoiceCard
                  key={m}
                  active={m === localMood}
                  onClick={() => setLocalMood(m)}
                  label={m}
                />
              ))}
            </div>
          </SheetSection>
        </div>

        <div className="px-5 pt-4">
          <button
            onClick={apply}
            className="h-12 w-full rounded-2xl bg-pink text-sm font-semibold text-white shadow-sm"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <div className="mb-2.5">
        <div className="text-sm font-semibold">{title}</div>
        {hint && <div className="mt-0.5 text-[11px] text-text-3">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left text-sm transition-all ${
        active
          ? "border-pink bg-pink-light font-semibold text-pink"
          : "border-border bg-surface text-text-2"
      }`}
    >
      <span>{label}</span>
      {active && <Check size={14} />}
    </button>
  );
}

function PlaceCard({ p }: { p: SeedPlace }) {
  const detailHref = p.kakaoPlaceUrl ?? kakaoMapSearchUrl(p.name, p.address);
  const routeHref = kakaoMapRouteUrl(p);
  const imgSrc = p.kakaoImageUrl ?? placeImage(p);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <a
        href={detailHref}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] w-full bg-secondary"
      >
        <img
          src={imgSrc}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src !== placeImage(p)) el.src = placeImage(p);
          }}
        />
        <span className="absolute right-2 top-2 tag-base bg-white/90 text-pink">{p.category}</span>
      </a>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{p.name}</div>
            <div className="mt-0.5 text-xs text-text-3">{p.address}</div>
            {p.kakaoCategory && (
              <div className="mt-0.5 text-[11px] text-text-3">{p.kakaoCategory}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[13px] font-semibold text-pink">{p.priceRange ?? "—"}</div>
            <div className="text-[10px] text-text-3">1인 가격대</div>
          </div>
        </div>

        {p.menuExamples && p.menuExamples.length > 0 && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-text-2">
            <Utensils size={12} className="mt-0.5 flex-shrink-0 text-text-3" />
            <span>{p.menuExamples.join(" · ")}</span>
          </div>
        )}

        {p.reason && (
          <div className="mt-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-text-2">
            {p.reason}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-text-2">
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{p.rating.toFixed(1)}</span>
            <span className="text-text-3">({p.reviewCount.toLocaleString()})</span>
          </div>
          {p.kakaoPhone && (
            <a
              href={`tel:${p.kakaoPhone.replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-1 text-text-2 hover:text-pink"
            >
              <Phone size={12} />
              {p.kakaoPhone}
            </a>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={detailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] text-[13px] font-semibold text-[#3C1E1E]"
          >
            <ExternalLink size={14} />
            카카오플레이스
          </a>
          <a
            href={routeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-[13px] font-semibold text-foreground"
          >
            <MapPin size={14} className="text-pink" />
            길찾기
          </a>
        </div>
      </div>
    </div>
  );
}


