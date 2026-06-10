import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star } from "lucide-react";
import { useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { MapView, AREA_COORDS } from "@/components/MapView";
import { api, type DatePlace } from "@/lib/api";


export const Route = createFileRoute("/places")({
  head: () => ({
    meta: [
      { title: "데이트 장소 추천 — 소개팅 AI" },
      { name: "description", content: "거리, 분위기, 애프터까지 AI가 맞춤 추천하는 데이트 장소." },
    ],
  }),
  component: Places,
});

const CATEGORIES = ["전체", "카페", "레스토랑", "와인바", "액티비티"];
const AREAS = ["성수동", "한남동", "강남", "홍대", "이태원", "연남동"];

function Places() {
  const [cat, setCat] = useState("전체");
  const [area, setArea] = useState("성수동");

  const { data: places = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["places", area, cat],
    queryFn: () => api.recommendPlaces({ area, category: cat }),
    staleTime: 5 * 60 * 1000,
  });
  const main = places.filter((p) => !p.isAfter);
  const after = places.filter((p) => p.isAfter);

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
            <button
              onClick={() => refetch()}
              className="rounded-full bg-pink-light px-3 py-1 text-xs font-semibold text-pink"
            >
              새로 추천
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`pill ${c === cat ? "pill-active" : ""}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="px-4 pt-3">
          <MapView
            lat={(AREA_COORDS[area] ?? AREA_COORDS["성수동"]).lat}
            lng={(AREA_COORDS[area] ?? AREA_COORDS["성수동"]).lng}
            zoom={14}
            height={180}
            label={`${area} · AI 추천 ${main.length}곳`}
            pins={main.slice(0, 5).map((p) => ({ lat: p.lat, lng: p.lng, label: p.name }))}
          />
        </div>


        <h2 className="px-4 pt-5 pb-3 text-base font-semibold">
          {area} 소개팅하기 좋은 장소
          {isFetching && !isLoading && <span className="ml-2 text-xs text-text-3">갱신 중…</span>}
        </h2>
        <div className="space-y-2.5 px-4">
          {isLoading && <div className="py-8 text-center text-sm text-text-3 animate-pulse">AI가 장소를 추천 중이에요…</div>}
          {!isLoading && main.length === 0 && (
            <div className="py-8 text-center text-sm text-text-3">추천된 장소가 없어요. 다시 시도해주세요.</div>
          )}
          {main.map((p) => <PlaceCard key={p.id} p={p} />)}
        </div>

        {after.length > 0 && (
          <>
            <div className="mx-4 mt-5 rounded-2xl border border-purple/15 bg-purple-light p-3.5">
              <div className="text-sm font-semibold text-purple">🍷 애프터로 추천</div>
              <div className="mt-0.5 text-xs text-purple/80">근처에서 이어가기 좋은 장소예요</div>
            </div>
            <div className="space-y-2.5 px-4 pt-3 pb-6">
              {after.map((p) => <PlaceCard key={p.id} p={p} />)}
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}

function PlaceCard({ p }: { p: DatePlace }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{p.name}</div>
          <div className="mt-0.5 text-xs text-text-3">{p.address}</div>
        </div>
        <span className="tag-base bg-pink-light text-pink">{p.category}</span>
      </div>
      {p.reason && (
        <div className="mt-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-text-2">
          ✨ {p.reason}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-text-2">
        <div className="flex items-center gap-1">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{p.rating.toFixed(1)}</span>
          <span className="text-text-3">({p.reviewCount.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-1 text-text-3">
          <MapPin size={12} />
          {p.distanceKm.toFixed(1)}km
        </div>
      </div>
    </div>
  );
}
