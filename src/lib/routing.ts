"use client";
import { estimateFallback, estimateWalk } from "./geo";
import type { Place, Stop, Travel, TravelMode } from "./types";

const cache = new Map<string, Travel>();

function key(a: Place, b: Place, mode: TravelMode) {
  return `${a.lat},${a.lng}>${b.lat},${b.lng}:${mode}`;
}

/** 두 장소 사이 이동 정보. 도보는 추정, 대중교통은 ODsay, 자동차는 카카오모빌리티 (서버 라우트 경유) */
export async function getTravel(a: Place, b: Place, mode: TravelMode): Promise<Travel> {
  const k = key(a, b, mode);
  const hit = cache.get(k);
  if (hit) return hit;

  let result: Travel;
  if (mode === "walk") {
    result = estimateWalk(a.lat, a.lng, b.lat, b.lng);
  } else {
    const qs = new URLSearchParams({ sx: String(a.lng), sy: String(a.lat), ex: String(b.lng), ey: String(b.lat) });
    try {
      const res = await fetch(`/api/${mode === "car" ? "directions" : "transit"}?${qs}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.tooClose)
        result = {
          ...estimateWalk(a.lat, a.lng, b.lat, b.lng),
          mode,
          note: mode === "transit" ? "700m 이내라 걸어서 이동" : "너무 가까워 걸어서 이동",
        };
      else result = { mode, minutes: data.minutes, meters: data.meters, fare: data.fare, path: data.path };
    } catch {
      result = estimateFallback(mode, a.lat, a.lng, b.lat, b.lng);
    }
  }
  cache.set(k, result);
  return result;
}

/** 이동 정보가 없거나 바뀐 구간만 다시 계산해서 새 stops 배열을 반환 */
export async function refreshTravels(stops: Stop[]): Promise<{ stops: Stop[]; changed: boolean }> {
  let changed = false;
  const next = await Promise.all(
    stops.map(async (s, i) => {
      const nextStop = stops[i + 1];
      if (!nextStop) {
        if (s.travel) {
          changed = true;
          return { ...s, travel: null };
        }
        return s;
      }
      const k = `${nextStop.place.lat},${nextStop.place.lng}`;
      const stale = !s.travel || s.travel.mode !== s.travelMode || s.travel.to !== k;
      if (!stale) return s;
      changed = true;
      const t = await getTravel(s.place, nextStop.place, s.travelMode);
      return { ...s, travel: { ...t, to: k } };
    }),
  );
  return { stops: next, changed };
}
