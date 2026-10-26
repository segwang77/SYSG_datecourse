import type { Travel } from "./types";

/** 두 좌표 사이 직선거리(m) */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 도보: 직선거리 × 1.3(우회계수), 분당 67m(시속 4km) */
export function estimateWalk(lat1: number, lng1: number, lat2: number, lng2: number): Travel {
  const meters = Math.round(haversine(lat1, lng1, lat2, lng2) * 1.3);
  return { mode: "walk", meters, minutes: Math.max(1, Math.round(meters / 67)) };
}

/** API 실패 시 대체 추정 (대중교통 평균 시속 18km + 대기 8분, 자동차 시속 25km) */
export function estimateFallback(mode: "transit" | "car", lat1: number, lng1: number, lat2: number, lng2: number): Travel {
  const meters = Math.round(haversine(lat1, lng1, lat2, lng2) * 1.4);
  const minutes = mode === "transit" ? Math.round(meters / 300) + 8 : Math.round(meters / 417) + 3;
  return { mode, meters, minutes: Math.max(1, minutes), estimated: true };
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}
