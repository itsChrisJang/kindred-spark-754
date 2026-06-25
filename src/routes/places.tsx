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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { MapView, AREA_COORDS } from "@/components/MapView";
import { type DatePlace } from "@/lib/api";
import placesSeed from "@/data/places.json";

type SeedPlace = DatePlace & { area: string; mood?: string };
const SEED = placesSeed as SeedPlace[];

export const Route = createFileRoute("/places")({
  head: () => ({
    meta: [
      { title: "데이트 장소 — 포테이토" },
      { name: "description", content: "동네, 분위기, 예산에 맞는 데이트 장소를 골라보세요." },
    ],
  }),
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

function naverMapUrl(name: string, address: string) {
  const q = encodeURIComponent(`${name} ${address}`);
  return `https://map.naver.com/p/search/${q}`;
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

function placeImage(p: DatePlace) {
  const pool = CATEGORY_IMAGES[p.category] ?? CATEGORY_IMAGES.카페;
  const hash = [...p.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[hash % pool.length];
}

function Places() {
  const [cat, setCat] = useState("전체");
  const [area, setArea] = useState("성수동");
  const [price, setPrice] = useState("전체");
  const [mood, setMood] = useState("전체");
  const [sort, setSort] = useState<Sort>("추천순");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    return SEED.filter((p) => p.area === area)
      .filter((p) => cat === "전체" || p.category === cat)
      .filter((p) => price === "전체" || p.priceRange === price)
      .filter((p) => mood === "전체" || p.mood === mood);
  }, [area, cat, price, mood]);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "평점순") return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });
  const main = sorted.filter((p) => !p.isAfter);
  const after = sorted.filter((p) => p.isAfter);

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

  // 시트가 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  return (
    <PhoneShell>
      <NavHeader back title="데이트 장소" />
      {/* Pinned filter bar (sibling of scroll-area) */}
      <div className="flex-shrink-0 border-b border-border bg-surface">

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
              <span className="truncate">{main.length + after.length}곳 추천중</span>
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

        {/* 카테고리 빠른 선택 */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {CATEGORIES.map(({ value, icon: Icon }) => {
            const active = value === cat;
            return (
              <button
                key={value}
                onClick={() => setCat(value)}
                className={`flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl border px-5 pt-2 pb-1.5 transition-all ${
                  active
                    ? "border-pink bg-pink text-white shadow-sm"
                    : "border-border bg-surface text-text-2"
                }`}
              >
                <Icon size={16} />
                <span className="text-[11px] font-semibold">{value}</span>
              </button>
            );
          })}
        </div>

        {/* 정렬 */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-base font-semibold">
            {area} 추천 <span className="text-pink">{main.length}</span>곳
          </h2>
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
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
                        setSort(s.value);
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
        </div>

        <div className="px-4 pt-3">
          <MapView
            lat={(AREA_COORDS[area] ?? AREA_COORDS["성수동"]).lat}
            lng={(AREA_COORDS[area] ?? AREA_COORDS["성수동"]).lng}
            zoom={14}
            height={180}
            label={`${area} · 추천 ${main.length}곳`}
            pins={main.slice(0, 5).map((p) => ({ lat: p.lat, lng: p.lng, label: p.name }))}
          />
        </div>

        <div className="space-y-3 px-4 pt-4">
          {main.length === 0 && (
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
          {main.map((p) => (
            <PlaceCard key={p.id} p={p} />
          ))}
        </div>

        {after.length > 0 && (
          <>
            <div className="mx-4 mt-5 rounded-2xl border border-purple/15 bg-purple-light p-3.5">
              <div className="text-sm font-semibold text-purple">애프터로 추천</div>
              <div className="mt-0.5 text-xs text-purple/80">근처에서 이어가기 좋은 장소예요</div>
            </div>
            <div className="space-y-3 px-4 pt-3 pb-6">
              {after.map((p) => (
                <PlaceCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
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

function PlaceCard({ p }: { p: DatePlace }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-[16/9] w-full bg-secondary">
        <img
          src={placeImage(p)}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=70";
          }}
        />
        <span className="absolute right-2 top-2 tag-base bg-white/90 text-pink">{p.category}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-[15px] font-semibold">{p.name}</div>
            <div className="mt-0.5 text-xs text-text-3">{p.address}</div>
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
          {typeof p.distanceKm === "number" && (
            <div className="flex items-center gap-1 text-text-3">
              <MapPin size={12} />
              {p.distanceKm.toFixed(1)}km
            </div>
          )}
        </div>

        <a
          href={naverMapUrl(p.name, p.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] text-[13px] font-semibold text-white"
        >
          <ExternalLink size={14} />
          네이버 지도에서 예약·길찾기
        </a>
      </div>
    </div>
  );
}
