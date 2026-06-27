import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

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

function balloonHtml(name: string, sublabel?: string) {
  const safeName = escapeHtml(name);
  const sub = sublabel
    ? `<div style="font-size:10px;font-weight:500;color:#FF4B7B;line-height:1.25;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${escapeHtml(sublabel)}</div>`
    : "";
  return `<div style="transform:translate(-50%,-160%);background:#fff;border:1px solid #FFD3DF;border-radius:12px;padding:6px 10px;box-shadow:0 4px 14px rgba(255,75,123,0.18);display:inline-block;"><div style="font-size:12px;font-weight:700;color:#111;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${safeName}</div>${sub}</div>`;
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
  pins?: { id?: string; lat: number; lng: number; label?: string; sublabel?: string }[];
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
    const marker = new kakao.maps.Marker({ position: pos, map });
    let iw: any;
    if (label) {
      iw = new kakao.maps.CustomOverlay({
        position: pos,
        content: `<div style="${BALLOON_STYLE}">${escapeHtml(label)}</div>`,
        yAnchor: 1,
        xAnchor: 0.5,
      });
      iw.setMap(map);
    }
    return () => {
      marker.setMap(null);
      iw?.setMap(null);
    };
  }, [ready, hasPins, lat, lng, label]);

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
      const marker = new kakao.maps.Marker({ position: pos, map, clickable: true });
      markersRef.current.push(marker);

      const handlerId = p.id ?? p.label ?? `${p.lat},${p.lng}`;
      kakao.maps.event.addListener(marker, "click", () => {
        onPinClickRef.current?.(handlerId);
      });

      if (p.label) {
        const iw = new kakao.maps.CustomOverlay({
          position: pos,
          content: `<div style="${BALLOON_STYLE}">${escapeHtml(p.label)}</div>`,
          yAnchor: 1,
          xAnchor: 0.5,
        });
        iw.setMap(map);
        markersRef.current.push({ setMap: (m: any) => iw.setMap(m) });
      }
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
