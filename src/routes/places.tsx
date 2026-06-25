import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Search, Star, ExternalLink, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
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

const CATEGORIES = ["전체", "카페", "레스토랑", "와인바", "액티비티"];
const AREAS = ["성수동", "한남동", "강남", "홍대", "이태원", "연남동"];
const PRICE = ["전체", "1만원 이하", "1만~3만원", "3만~5만원", "5만원 이상"];
const MOOD = ["전체", "조용함", "감성적", "활기참", "프라이빗"];
const SORT = ["추천순", "평점순"] as const;
type Sort = (typeof SORT)[number];

function naverMapUrl(name: string, address: string) {
  const q = encodeURIComponent(`${name} ${address}`);
  return `https://map.naver.com/v5/search/${q}`;
}

function placeImage(p: DatePlace) {
  const q = encodeURIComponent(p.imageQuery || `${p.category} ${p.name}`);
  return `https://source.unsplash.com/featured/600x400/?${q}`;
}

function Places() {
  const [cat, setCat] = useState("전체");
  const [area, setArea] = useState("성수동");
  const [price, setPrice] = useState("전체");
  const [mood, setMood] = useState("전체");
  const [sort, setSort] = useState<Sort>("추천순");

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
  const isLoading = false;

  return (
    <PhoneShell>
      <NavHeader back title="데이트 장소" />
      <div className="scroll-area">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5">
            <Search size={16} className="text-text-3" />
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span className="rounded-full bg-pink-light px-3 py-1 text-xs font-semibold text-pink">
              {main.length + after.length}곳
            </span>
          </div>
        </div>

        {/* 필터들 */}
        <FilterRow label="카테고리" items={CATEGORIES} value={cat} onChange={setCat} />
        <FilterRow label="가격대" items={PRICE} value={price} onChange={setPrice} />
        <FilterRow label="분위기" items={MOOD} value={mood} onChange={setMood} />
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="text-[11px] text-text-3">정렬</span>
          {SORT.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-[12px] ${sort === s ? "text-pink font-semibold" : "text-text-3"}`}
            >
              {s}
            </button>
          ))}
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

        <h2 className="px-4 pt-5 pb-3 text-base font-semibold">
          {area} 소개팅하기 좋은 장소
        </h2>
        <div className="space-y-3 px-4">
          {!isLoading && main.length === 0 && (
            <div className="py-8 text-center text-sm text-text-3">추천된 장소가 없어요. 다시 시도해주세요.</div>
          )}
          {main.map((p) => <PlaceCard key={p.id} p={p} />)}
        </div>

        {after.length > 0 && (
          <>
            <div className="mx-4 mt-5 rounded-2xl border border-purple/15 bg-purple-light p-3.5">
              <div className="text-sm font-semibold text-purple">애프터로 추천</div>
              <div className="mt-0.5 text-xs text-purple/80">근처에서 이어가기 좋은 장소예요</div>
            </div>
            <div className="space-y-3 px-4 pt-3 pb-6">
              {after.map((p) => <PlaceCard key={p.id} p={p} />)}
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}

function FilterRow({ label, items, value, onChange }: { label: string; items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="px-4 pt-3">
      <div className="mb-1 text-[11px] text-text-3">{label}</div>
      <div className="flex gap-2 overflow-x-auto">
        {items.map((i) => (
          <button key={i} onClick={() => onChange(i)} className={`pill ${i === value ? "pill-active" : ""}`}>
            {i}
          </button>
        ))}
      </div>
    </div>
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
