/**
 * KATECH ↔ WGS84 좌표 변환 (Opinet API용)
 *
 * Opinet API는 KATECH 좌표를 사용합니다. 프론트엔드 지도(WGS84)와의 변환을 위해
 * proj4를 이용한 헬퍼를 제공합니다.
 *
 * Kotlin 백엔드가 변환을 담당하는 경우 이 모듈은 사용하지 않아도 됩니다.
 */
import proj4 from "proj4";

// KATECH (한국 자동차 산업 표준 좌표계)
proj4.defs(
  "KATECH",
  "+proj=tmerc +lat_0=38 +lon_0=128 +k=0.9999 +x_0=400000 +y_0=600000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43",
);

export function katechToWgs84(x: number, y: number): { lng: number; lat: number } {
  const [lng, lat] = proj4("KATECH", "WGS84", [x, y]);
  return { lng, lat };
}

export function wgs84ToKatech(lng: number, lat: number): { x: number; y: number } {
  const [x, y] = proj4("WGS84", "KATECH", [lng, lat]);
  return { x, y };
}
