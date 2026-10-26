import type { LiveState, Stop, TimelineEntry } from "./types";

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const dayOver = min >= 1440 ? "+1 " : "";
  return `${dayOver}${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 시작 시각 + (체류시간 + 이동시간)을 순서대로 누적해 장소별 도착/출발 시각을 만든다.
 * 당일 모드(live)에서는 실제 도착 시각과 추가 체류시간을 반영해 이후 일정을 자동으로 다시 계산한다.
 */
export function computeTimeline(startTime: string, stops: Stop[], live?: LiveState | null): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  let cursor = toMin(startTime || "12:00");
  stops.forEach((s, i) => {
    const actual = live?.actualArrivals?.[s.uid];
    let arrive = cursor;
    if (actual) {
      arrive = toMin(actual);
      // 자정을 넘긴 경우 보정
      if (arrive < cursor - 720) arrive += 1440;
    }
    const stay = s.stayMinutes + (live?.extraStay?.[s.uid] ?? 0);
    const depart = arrive + stay;
    out.push({ uid: s.uid, arrive: toHHMM(arrive), depart: toHHMM(depart), arriveMin: arrive, departMin: depart, actual: !!actual });
    const travel = i < stops.length - 1 ? s.travel?.minutes ?? 0 : 0;
    cursor = depart + travel;
  });
  return out;
}

export function totalCost(stops: Stop[]): number {
  return stops.reduce((sum, s) => sum + (s.cost || 0) + (s.travel?.fare ? s.travel.fare * 2 : 0), 0);
}

export function totalMinutes(stops: Stop[]): number {
  return stops.reduce((sum, s, i) => sum + s.stayMinutes + (i < stops.length - 1 ? s.travel?.minutes ?? 0 : 0), 0);
}
