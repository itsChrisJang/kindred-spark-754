import { MapPin } from "lucide-react";

/**
 * OpenStreetMap iframe 기반 지도. API key 불필요.
 * 핀은 오버레이 div로 표시.
 */
export function MapView({
  lat,
  lng,
  zoom = 15,
  height = 180,
  pins,
  label,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  pins?: { lat: number; lng: number; label?: string }[];
  label?: string;
}) {
  // bbox 계산: zoom 에 따라 범위 결정 (대략적)
  const d = 0.012 * Math.pow(2, 15 - zoom);
  const bbox = `${lng - d},${lat - d / 1.5},${lng + d},${lat + d / 1.5}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-secondary"
      style={{ height }}
    >
      <iframe
        title="지도"
        src={src}
        className="h-full w-full"
        style={{ border: 0 }}
        loading="lazy"
      />
      {/* 추가 핀 오버레이 (시각 표시용) */}
      {pins && pins.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {pins.slice(0, 5).map((p, i) => (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `${20 + i * 14}%`, top: `${30 + (i % 2) * 18}%` }}
            >
              <div className="flex h-7 w-7 -rotate-45 items-center justify-center rounded-tl-full rounded-tr-full rounded-bl-full bg-pink shadow-lg">
                <MapPin size={12} className="rotate-45 text-white" />
              </div>
              {p.label && (
                <div className="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow">
                  {p.label}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {label && (
        <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow backdrop-blur">
          📍 {label}
        </div>
      )}
    </div>
  );
}

// 한국 주요 지역 좌표
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  성수동: { lat: 37.5447, lng: 127.0557 },
  한남동: { lat: 37.5347, lng: 127.0023 },
  강남: { lat: 37.4979, lng: 127.0276 },
  홍대: { lat: 37.5563, lng: 126.9236 },
  이태원: { lat: 37.5347, lng: 126.9947 },
  연남동: { lat: 37.5614, lng: 126.9237 },
};
