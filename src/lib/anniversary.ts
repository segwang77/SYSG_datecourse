/** 사귄 날 기준 기념일 계산 (사귄 날 = 1일) */
export interface Milestone {
  label: string;
  date: string; // YYYY-MM-DD
  dday: number; // 0 = 오늘
}

function parse(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfToday() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function daysTogether(start: string): number {
  return Math.floor((startOfToday().getTime() - parse(start).getTime()) / 86400000) + 1;
}

/** 다가오는 기념일 (100일 단위 + 매년 주년) */
export function upcomingMilestones(start: string, count = 3): Milestone[] {
  const s = parse(start);
  const today = startOfToday();
  const list: Milestone[] = [];
  for (let n = 100; n <= 10000; n += 100) {
    const d = new Date(s);
    d.setDate(d.getDate() + n - 1);
    if (d >= today) list.push({ label: `${n}일`, date: fmt(d), dday: Math.round((d.getTime() - today.getTime()) / 86400000) });
  }
  for (let y = 1; y <= 30; y++) {
    const d = new Date(s);
    d.setFullYear(d.getFullYear() + y);
    if (d >= today) list.push({ label: `${y}주년`, date: fmt(d), dday: Math.round((d.getTime() - today.getTime()) / 86400000) });
  }
  return list.sort((a, b) => a.dday - b.dday).slice(0, count);
}
