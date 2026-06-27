import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";


/**
 * 카카오맵 기반 지도 컴포넌트.
 * - VITE_KAKAO_MAP_KEY 필요 (도메인 화이트리스트로 보호되는 퍼블릭 JS 키)
 * - SDK는 최초 마운트 시 lazy-load, 이후 싱글톤 재사용
 */

declare global {
  interface Window {
    kakao: any;
  }
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
let sdkPromise: Promise<any> | null = null;

function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.kakao?.maps) return Promise.resolve(window.kakao);
  if (sdkPromise) return sdkPromise;
  if (!KAKAO_KEY) return Promise.reject(new Error("VITE_KAKAO_MAP_KEY missing"));

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    const onReady = () => window.kakao.maps.load(() => resolve(window.kakao));
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("Kakao SDK load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = "kakao-maps-sdk";
    s.async = true;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    s.onload = onReady;
    s.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function pinHtml(selected = false): string {
  // 정방향 핑크 티어드롭 SVG (회전 없음 → 기울어 보이지 않음)
  const w = selected ? 34 : 28;
  const h = selected ? 44 : 36;
  const shadow = selected
    ? "drop-shadow(0 6px 12px rgba(255,75,123,0.45))"
    : "drop-shadow(0 4px 8px rgba(255,75,123,0.3))";
  const fill = selected ? "#FF2E66" : "#FF4B7B";
  return `<div style="transform:translate(-50%,-100%);cursor:pointer;filter:${shadow};">
    <svg width="${w}" height="${h}" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 1.5C7.1 1.5 1.5 7.1 1.5 14c0 8.4 10.3 19.1 11.5 20.3.55.55 1.45.55 2 0C16.2 33.1 26.5 22.4 26.5 14 26.5 7.1 20.9 1.5 14 1.5Z" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="13.5" r="4.5" fill="#fff"/>
    </svg>
  </div>`;
}

export function MapView({
  lat,
  lng,
  zoom = 4,
  height = 180,
  pins,
  label,
  fill = false,
  centerOffsetY = 0,
  onPinClick,
}: {
  lat: number;
  lng: number;
  /** 카카오맵 level (1=가장 가까움, 14=가장 멈). 기본 4 (≈ OSM zoom 15). */
  zoom?: number;
  height?: number;
  pins?: { id?: string; lat: number; lng: number; label?: string; sublabel?: string; selected?: boolean }[];
  label?: string;
  /** true면 부모 컨테이너를 100%로 채움 */
  fill?: boolean;
  /** 지도 중심 위치를 픽셀 단위로 보정. 양수면 view를 아래로 이동(=마커가 위로 올라옴). */
  centerOffsetY?: number;
  /** 마커 클릭 콜백 */
  onPinClick?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const onPinClickRef = useRef(onPinClick);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  // pins reference is unstable across parent renders → derive a stable key
  const pinsKey = useMemo(
    () =>
      (pins ?? [])
        .map((p) => `${p.id ?? ""}@${p.lat.toFixed(6)},${p.lng.toFixed(6)}#${p.label ?? ""}`)
        .join("|"),
    [pins],
  );
  const hasPins = (pins?.length ?? 0) > 0;

  // 1) Init (한 번)
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level: zoom,
        });
        setReady(true);
      })
      .catch((err) => {
        console.warn("[MapView] Kakao SDK 로드 실패:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Center / zoom 갱신 (+ 픽셀 오프셋)
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    map.setLevel(zoom);
    map.setCenter(new kakao.maps.LatLng(lat, lng));
    if (centerOffsetY) {
      // panBy: 양수 dy → view가 아래로 → 중심점이 화면상 위쪽으로 올라옴
      requestAnimationFrame(() => map.panBy(0, centerOffsetY));
    }
  }, [ready, lat, lng, zoom, centerOffsetY]);

  // 3) 중심 마커 (pins 없을 때만)
  useEffect(() => {
    if (!ready || hasPins) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;

    const pos = new kakao.maps.LatLng(lat, lng);
    const overlay = new kakao.maps.CustomOverlay({
      position: pos,
      content: pinHtml(false),
      yAnchor: 1,
      xAnchor: 0.5,
      zIndex: 3,
    });
    overlay.setMap(map);
    return () => {
      overlay.setMap(null);
    };
  }, [ready, hasPins, lat, lng]);

  // 4) 다중 핀 마커 (pinsKey 기반 — 부모 리렌더에 영향 없음)
  useEffect(() => {
    if (!ready) return;
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;

    // 이전 핀 제거
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];

    if (!pins || pins.length === 0) return;

    pins.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      const handlerId = p.id ?? p.label ?? `${p.lat},${p.lng}`;

      const el = document.createElement("div");
      el.innerHTML = pinHtml(false);
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClickRef.current?.(handlerId);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 3,
        clickable: true,
      });
      overlay.setMap(map);
      markersRef.current.push({ setMap: (m: any) => overlay.setMap(m) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinsKey]);



  const wrapperBase = fill
    ? "relative h-full w-full bg-secondary"
    : "relative overflow-hidden rounded-2xl border border-border bg-secondary";
  const wrapperStyle = fill ? { width: "100%", height: "100%" } : { height, width: "100%" };

  // 키 미설정 또는 SDK 로드 실패 시 OSM 폴백
  if (!KAKAO_KEY || failed) {
    const bbox = `${lng - 0.008},${lat - 0.005},${lng + 0.008},${lat + 0.005}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    return (
      <div className={wrapperBase} style={wrapperStyle}>
        <iframe
          title={label ?? "지도"}
          src={src}
          className="h-full w-full"
          style={{ border: 0 }}
          loading="lazy"
        />
        {label && (
          <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow">
            <MapPin size={11} className="text-pink" />
            {label}
          </div>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className={wrapperBase} style={wrapperStyle} />;
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
