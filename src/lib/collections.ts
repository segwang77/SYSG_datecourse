import type { Course } from "./types";

/** 테마 컬렉션 — 태그 쿼리 + 클라이언트 필터 조합 */
export interface ThemeCollection {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  tag?: string;
  filter?: (c: Course) => boolean;
}

export const COLLECTIONS: ThemeCollection[] = [
  { slug: "rainy-day", title: "비 오는 날 코스", description: "우산 없이도 괜찮은 실내 위주 코스", emoji: "☔", tag: "비오는날" },
  { slug: "under-50k", title: "5만원 이하 코스", description: "둘이서 5만원이면 충분한 가성비 코스", emoji: "💸", filter: (c) => c.totalCost > 0 && c.totalCost <= 50000 },
  { slug: "first-date", title: "첫 데이트 코스", description: "대화하기 좋고 부담 없는 동선", emoji: "🌱", tag: "첫데이트" },
  { slug: "anniversary", title: "기념일 코스", description: "특별한 날을 위한 코스", emoji: "💝", tag: "기념일" },
  { slug: "night-view", title: "야경 코스", description: "해 진 뒤가 더 좋은 코스", emoji: "🌃", tag: "야경" },
  { slug: "walk-only", title: "걸어서만 다니는 코스", description: "모든 구간 도보 20분 이내", emoji: "🚶", filter: (c) => c.stops.length > 1 && c.stops.every((s, i) => i === c.stops.length - 1 || (s.travelMode === "walk" && (s.travel?.minutes ?? 0) <= 20)) },
];

export function findCollection(slug: string) {
  return COLLECTIONS.find((c) => c.slug === slug);
}
