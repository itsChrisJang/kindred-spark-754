import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star } from "lucide-react";
import { useState } from "react";
import { PhoneShell, NavHeader } from "@/components/PhoneShell";
import { api } from "@/lib/api";

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

function Places() {
  const [cat, setCat] = useState("전체");
  const { data: places = [], isLoading } = useQuery({
    queryKey: ["places", cat],
    queryFn: () => api.recommendPlaces({ category: cat }),
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
            <input
              placeholder="장소·지역 검색"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`pill ${c === cat ? "pill-active" : ""}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Map placeholder */}
        <div className="px-4 pt-3">
          <div className="relative h-40 overflow-hidden rounded-2xl bg-[#D8EBD3]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {main.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className="absolute"
                style={{ left: `${30 + i * 18}%`, top: `${30 + (i % 2) * 18}%` }}
              >
                <div className="flex h-7 w-7 -rotate-45 items-center justify-center rounded-tl-full rounded-tr-full rounded-bl-full bg-pink shadow-lg">
                  <MapPin size={12} className="rotate-45 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="px-4 pt-5 pb-3 text-base font-semibold">소개팅하기 좋은 장소</h2>
        <div className="space-y-2.5 px-4">
          {isLoading && <div className="py-6 text-center text-sm text-text-3">불러오는 중…</div>}
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

function PlaceCard({ p }: { p: ReturnType<typeof Math.random> extends never ? never : import("@/lib/api").DatePlace }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold">{p.name}</div>
          <div className="mt-0.5 text-xs text-text-3">{p.address}</div>
        </div>
        <span className="tag-base bg-pink-light text-pink">{p.category}</span>
      </div>
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
