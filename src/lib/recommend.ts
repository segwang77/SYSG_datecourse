"use client";
import { CATEGORIES, categoryOf, type AppCategory } from "./categories";
import { searchByCategory } from "./kakao";
import { newStop } from "./courses";
import { estimateWalk } from "./geo";
import { totalCost, totalMinutes } from "./timeline";
import type { Mood, Place, Stop } from "./types";

/**
 * 가격대 단계 — 카카오 API에는 가격 정보가 없어서, 검색 키워드로 가격대를 구분하고
 * 두 사람 기준 예상 비용을 붙인다. 예산에 맞춰 단계를 내리거나 올린다.
 */
interface Tier {
  label: string;
  keyword?: string;
  kakaoCode?: string;
  cost: number; // 2인 예상 비용
  stay?: number; // 기본 체류시간과 다를 때
}

export const TIERS: Record<string, Tier[]> = {
  food: [
    { label: "분식·국밥", keyword: "분식", cost: 20000, stay: 50 },
    { label: "캐주얼 식당", kakaoCode: "FD6", cost: 40000 },
    { label: "레스토랑", keyword: "레스토랑", cost: 70000, stay: 90 },
    { label: "파인다이닝", keyword: "파인다이닝", cost: 150000, stay: 120 },
  ],
  cafe: [
    { label: "카페", kakaoCode: "CE7", cost: 12000 },
    { label: "디저트 카페", keyword: "디저트카페", cost: 22000 },
  ],
  culture: [
    { label: "서점", keyword: "독립서점", cost: 0, stay: 40 },
    { label: "전시·공연", kakaoCode: "CT1", cost: 30000 },
  ],
  walk: [{ label: "산책", keyword: "공원", cost: 0 }],
  sight: [{ label: "명소", kakaoCode: "AT4", cost: 0 }],
  activity: [
    { label: "보드게임", keyword: "보드게임카페", cost: 16000 },
    { label: "방탈출", keyword: "방탈출", cost: 44000 },
    { label: "공방 체험", keyword: "공방", cost: 70000, stay: 120 },
  ],
  bar: [
    { label: "포차", keyword: "포차", cost: 35000 },
    { label: "펍·와인바", keyword: "와인바", cost: 60000 },
    { label: "루프탑바", keyword: "루프탑바", cost: 90000 },
  ],
};

interface Slot {
  cat: string; // 앱 카테고리 key
  tier: number; // 분위기에 어울리는 기본 가격대
  optional?: boolean; // 예산·시간이 부족하면 먼저 빼는 슬롯
}

/** 분위기별 코스 템플릿 */
const TEMPLATES: Record<Mood, Slot[]> = {
  calm: [{ cat: "cafe", tier: 0 }, { cat: "culture", tier: 1 }, { cat: "walk", tier: 0, optional: true }, { cat: "food", tier: 1 }, { cat: "bar", tier: 1, optional: true }],
  active: [{ cat: "activity", tier: 1 }, { cat: "food", tier: 1 }, { cat: "cafe", tier: 0, optional: true }, { cat: "activity", tier: 0, optional: true }, { cat: "bar", tier: 0, optional: true }],
  anniversary: [{ cat: "culture", tier: 1 }, { cat: "cafe", tier: 1 }, { cat: "food", tier: 2 }, { cat: "bar", tier: 2, optional: true }],
  casual: [{ cat: "food", tier: 1 }, { cat: "cafe", tier: 0 }, { cat: "walk", tier: 0, optional: true }, { cat: "sight", tier: 0, optional: true }],
};

/** 비 올 때 실외 슬롯을 대신할 실내 슬롯 */
const RAIN_SWAPS: Slot[] = [
  { cat: "culture", tier: 0, optional: true },
  { cat: "activity", tier: 0, optional: true },
  { cat: "culture", tier: 1, optional: true },
];

/** 예산이 남을 때 먼저 올려줄 카테고리 순서 */
const UPGRADE_PRIORITY = ["food", "bar", "culture", "activity", "cafe"];

export interface RecommendInput {
  center: { lat: number; lng: number };
  hours: number;
  budget: number;
  mood: Mood;
  rainy: boolean;
  variant: number; // 같은 조건에서 다른 결과를 내기 위한 시드
}

export interface RecommendedCourse {
  stops: Stop[];
  labels: string[]; // stops 와 같은 순서의 가격대 이름 (예: "레스토랑")
  totalCost: number;
  totalMinutes: number;
  budget: number;
  overBudget: boolean;
}

interface PlanItem {
  cat: string;
  tier: number;
  pref: number; // 원래 템플릿이 원한 가격대
  optional: boolean;
}

function catByKey(key: string): AppCategory {
  return CATEGORIES.find((c) => c.key === key)!;
}

const tierOf = (x: { cat: string; tier: number }) => TIERS[x.cat][x.tier];
const planCost = (plan: PlanItem[]) => plan.reduce((sum, x) => sum + tierOf(x).cost, 0);

/**
 * 예산 맞추기 (장소 검색 전에 계획 단계에서 조정)
 * 초과 시 코스의 핵심은 최대한 지키도록 아래 순서로 줄인다.
 *   ① 선택 슬롯의 가격대를 내림 → ② 유료 선택 슬롯을 뺌
 *   → ③ 핵심 슬롯의 가격대를 내림 → ④ 식사를 제외한 유료 핵심 슬롯을 뺌 (최소 2곳 유지)
 * 여유가 있으면 우선순위 카테고리부터 한 단계씩 올린다 (분위기 기본값 +1단계까지, 예산의 90% 이내).
 */
export function fitBudget(plan: PlanItem[], budget: number): PlanItem[] {
  const p = plan.map((x) => ({ ...x }));
  const cost = (i: number) => tierOf(p[i]).cost;
  /** 조건에 맞는 슬롯 중 가장 비싼 것의 인덱스 */
  const priciest = (pred: (x: PlanItem) => boolean) =>
    p
      .map((x, i) => ({ x, i }))
      .filter(({ x, i }) => pred(x) && cost(i) > 0)
      .sort((a, b) => cost(b.i) - cost(a.i))[0]?.i;

  while (planCost(p) > budget) {
    const optDown = priciest((x) => x.optional && x.tier > 0);
    if (optDown != null) { p[optDown].tier--; continue; }

    const optDrop = priciest((x) => x.optional);
    if (optDrop != null && p.length > 2) { p.splice(optDrop, 1); continue; }

    const coreDown = priciest((x) => !x.optional && x.tier > 0);
    if (coreDown != null) { p[coreDown].tier--; continue; }

    const coreDrop = priciest((x) => x.cat !== "food");
    if (coreDrop != null && p.length > 2) { p.splice(coreDrop, 1); continue; }

    break; // 최소 구성으로도 예산 초과 → 화면에 경고 표시
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of UPGRADE_PRIORITY) {
      const x = p.find((it) => it.cat === cat && it.tier < Math.min(TIERS[cat].length - 1, it.pref + 1));
      if (!x) continue;
      const delta = TIERS[cat][x.tier + 1].cost - tierOf(x).cost;
      if (planCost(p) + delta <= budget * 0.9) {
        x.tier++;
        changed = true;
        break;
      }
    }
  }
  return p;
}

/** 간단한 시드 기반 난수 (variant 별로 다른 장소를 고르기 위함) */
function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** 원하는 가격대로 못 찾으면 더 저렴한 단계로 내려가며 찾는다 */
async function pickNear(
  item: PlanItem,
  at: { lat: number; lng: number },
  used: Set<string>,
  rand: () => number,
): Promise<{ place: Place; tier: number } | null> {
  for (let t = item.tier; t >= 0; t--) {
    const tier = TIERS[item.cat][t];
    const query = tier.keyword ? { keyword: tier.keyword } : { kakaoCode: tier.kakaoCode };
    for (const radius of [700, 1500, 3000]) {
      const { places } = await searchByCategory(query, { ...at, radius });
      const fresh = places.filter((p) => !used.has(p.id));
      if (fresh.length) {
        const top = fresh.slice(0, 5);
        return { place: top[Math.floor(rand() * top.length)], tier: t };
      }
    }
  }
  return null;
}

/**
 * 조건 기반 코스 생성
 * 1) 분위기 템플릿에서 시간에 맞게 슬롯 수를 정하고
 * 2) 비가 오면 실외 슬롯을 실내로 바꾸고
 * 3) 예산에 맞게 가격대를 내리거나 올리거나 슬롯을 뺀 뒤
 * 4) 직전 장소 근처(도보권)에서 순서대로 장소를 고른다
 */
export async function recommendCourse(input: RecommendInput): Promise<RecommendedCourse> {
  const rand = seeded(input.variant + 1);
  let slots = [...TEMPLATES[input.mood]];
  if (input.rainy) {
    let swapIdx = input.variant;
    slots = slots.map((s) => (catByKey(s.cat).indoor ? s : RAIN_SWAPS[swapIdx++ % RAIN_SWAPS.length]));
  }

  // 시간 안에 들어가는 만큼만 (장소 사이 이동 15분 가정)
  const limitMin = input.hours * 60;
  const timed: PlanItem[] = [];
  let acc = 0;
  for (const s of slots) {
    const need = (TIERS[s.cat][s.tier].stay ?? catByKey(s.cat).defaultStay) + (timed.length ? 15 : 0);
    if (timed.length >= 2 && acc + need > limitMin) break;
    timed.push({ cat: s.cat, tier: s.tier, pref: s.tier, optional: !!s.optional });
    acc += need;
  }

  const plan = fitBudget(timed, input.budget);

  const used = new Set<string>();
  const stops: Stop[] = [];
  const labels: string[] = [];
  let at = input.center;
  for (const item of plan) {
    const found = await pickNear(item, at, used, rand);
    if (!found) continue;
    const tier = TIERS[item.cat][found.tier];
    used.add(found.place.id);
    const stop = newStop(found.place);
    stop.stayMinutes = tier.stay ?? catByKey(item.cat).defaultStay;
    stop.cost = tier.cost;
    stops.push(stop);
    labels.push(tier.label);
    at = { lat: found.place.lat, lng: found.place.lng };
  }

  // 도보 이동 추정치 채우기
  const withTravel = (list: Stop[]) =>
    list.map((s, i) => {
      const n = list[i + 1];
      if (!n) return { ...s, travel: null };
      return { ...s, travel: { ...estimateWalk(s.place.lat, s.place.lng, n.place.lat, n.place.lng), to: `${n.place.lat},${n.place.lng}` } };
    });

  const result = withTravel(stops);
  const cost = totalCost(result);
  return {
    stops: result,
    labels,
    totalCost: cost,
    totalMinutes: totalMinutes(result),
    budget: input.budget,
    overBudget: cost > input.budget,
  };
}

/** 앵커 장소 기준으로 앞뒤에 어울리는 카테고리 */
const COMPLEMENT: Record<string, string[]> = {
  food: ["cafe", "bar", "walk"],
  cafe: ["culture", "walk", "food"],
  culture: ["cafe", "food"],
  walk: ["cafe", "food"],
  bar: ["food", "walk"],
  activity: ["food", "cafe"],
  sight: ["cafe", "food"],
  spot: ["cafe", "food"],
};

export interface NearbyGroup {
  category: AppCategory;
  places: Place[];
}

/** 확정한 장소(앵커) 근처에서 전후로 갈 만한 곳 추천 */
export async function recommendAround(anchor: Place, excludeIds: string[] = []): Promise<NearbyGroup[]> {
  const cat = categoryOf(anchor.groupCode, anchor.category);
  const keys = COMPLEMENT[cat.key] ?? ["cafe", "food"];
  const groups = await Promise.all(
    keys.map(async (k) => {
      const c = catByKey(k);
      const { places } = await searchByCategory(c, { lat: anchor.lat, lng: anchor.lng, radius: 600, sortByDistance: true });
      return { category: c, places: places.filter((p) => p.id !== anchor.id && !excludeIds.includes(p.id)).slice(0, 5) };
    }),
  );
  return groups.filter((g) => g.places.length);
}

/** 비 오는 날 실외 장소를 대신할 근처 실내 장소 */
export async function indoorAlternatives(place: Place): Promise<Place[]> {
  const results = await Promise.all(
    [{ kakaoCode: "CT1" }, { keyword: "독립서점" }, { keyword: "공방" }].map((q) =>
      searchByCategory(q, { lat: place.lat, lng: place.lng, radius: 1000, sortByDistance: true }).then((r) => r.places.slice(0, 3)),
    ),
  );
  return results.flat();
}

export function isOutdoor(stop: Stop) {
  return !categoryOf(stop.place.groupCode, stop.place.category).indoor;
}
