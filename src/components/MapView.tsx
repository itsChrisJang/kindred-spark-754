import { useEffect, useRef, useState } from "react";
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

export function MapView({
  lat,
  lng,
  zoom = 4,
  height = 180,
  pins,
  label,
  fill = false,
  onPinClick,
}: {
  lat: number;
  lng: number;
  /** 카카오맵 level (1=가장 가까움, 14=가장 멈). 기본 4 (≈ OSM zoom 15). */
  zoom?: number;
  height?: number;
  pins?: { id?: string; lat: number; lng: number; label?: string }[];
  label?: string;
  /** true면 부모 컨테이너를 100%로 채움 (height 무시, 보더/라운드 제거) */
  fill?: boolean;
  /** 마커 클릭 콜백 (id 또는 label 전달) */
  onPinClick?: (id: string) => void;
}) {

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [failed, setFailed] = useState(false);

  // 초기화
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level: zoom,
        });
      })
      .catch((err) => {
        console.warn("[MapView] Kakao SDK 로드 실패:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // 컨테이너 1회 초기화 — center/zoom 변경은 아래 effect에서 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // center / zoom 갱신
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;
    map.setCenter(new kakao.maps.LatLng(lat, lng));
    map.setLevel(zoom);
  }, [lat, lng, zoom]);

  // 마커 갱신 (중심 핀 + 추가 핀)
  useEffect(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const center = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(lat, lng),
      map,
    });
    markersRef.current.push(center);

    if (label) {
      const iw = new kakao.maps.InfoWindow({
        position: new kakao.maps.LatLng(lat, lng),
        content: `<div style="padding:4px 8px;font-size:11px;font-weight:500;">${escapeHtml(label)}</div>`,
      });

      iw.open(map, center);
      markersRef.current.push({ setMap: () => iw.close() });
    }

    pins?.forEach((p) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        map,
        clickable: true,
      });
      markersRef.current.push(marker);
      if (onPinClick) {
        const handlerId = p.id ?? p.label ?? `${p.lat},${p.lng}`;
        kakao.maps.event.addListener(marker, "click", () => onPinClick(handlerId));
      }
      if (p.label) {
        const iw = new kakao.maps.InfoWindow({
          position: new kakao.maps.LatLng(p.lat, p.lng),
          content: `<div style="padding:3px 6px;font-size:10px;">${escapeHtml(p.label)}</div>`,
        });

        iw.open(map, marker);
        markersRef.current.push({ setMap: () => iw.close() });
      }
    });
  }, [lat, lng, label, pins, onPinClick]);

  const wrapperBase = fill
    ? "relative h-full w-full bg-secondary"
    : "relative overflow-hidden rounded-2xl border border-border bg-secondary";
  const wrapperStyle = fill ? { width: "100%", height: "100%" } : { height, width: "100%" };


  // 키 미설정 또는 SDK 로드 실패 시 OpenStreetMap 정적 이미지로 대체 (마커 포함)
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
