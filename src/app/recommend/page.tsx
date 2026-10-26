"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import KakaoMap from "@/components/map/KakaoMap";
import DateField from "@/components/DateField";
import WeatherBadge, { type WeatherInfo } from "@/components/WeatherBadge";
import { useAuth } from "@/hooks/useAuth";
import { MOODS, REGIONS, categoryOf } from "@/lib/categories";
import { geocodeRegion } from "@/lib/kakao";
import { locateMe, nextHalfHour, type MyLocation } from "@/lib/location";
import { recommendCourse, type RecommendedCourse } from "@/lib/recommend";
import { createCourse } from "@/lib/courses";
import { formatDuration, formatWon } from "@/lib/geo";
import type { Mood } from "@/lib/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function RecommendInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user, loginKakao } = useAuth();
  const [region, setRegion] = useState(sp.get("region") ?? "성수");
  const [date, setDate] = useState(sp.get("date") ?? todayStr());
  const [start, setStart] = useState("13:00");
  const [hours, setHours] = useState(5);
  const [budget, setBudget] = useState(100000);
  const [mood, setMood] = useState<Mood>((sp.get("mood") as Mood) ?? "casual");
  const [rainOverride, setRainOverride] = useState<boolean | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [results, setResults] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState<MyLocation | null>(null); // 현재 위치 기준일 때
  const [locating, setLocating] = useState(false);
  const autoRan = useRef(false);

  /** 현재 위치 가져오기 → 오늘·다음 30분부터 시작하도록 맞춤 */
  async function locate(): Promise<MyLocation | null> {
    setLocating(true);
    setErr(null);
    try {
      const me = await locateMe();
      setOrigin(me);
      setDate(todayStr());
      setStart(nextHalfHour());
      return me;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      setLocating(false);
    }
  }

  // 홈의 "지금 내 주변 코스" 버튼(?near=1)으로 들어오면 바로 위치 확인 후 추천
  useEffect(() => {
    if (sp.get("near") !== "1" || autoRan.current) return;
    autoRan.current = true;
    locate().then((me) => me && run(me, nextHalfHour(), todayStr()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(from: MyLocation | null = origin, startAt = start, day = date) {
    setLoading(true);
    setErr(null);
    setResults([]);
    try {
      const center = from ? { lat: from.lat, lng: from.lng } : await geocodeRegion(region);
      if (!center) throw new Error("지역을 찾지 못했어요");
      // 날씨 확인 (5일 이내)
      const w: WeatherInfo = await fetch(`/api/weather?lat=${center.lat}&lng=${center.lng}&date=${day}&start=${startAt}&hours=${hours}`)
        .then((r) => (r.ok ? r.json() : { available: false }))
        .catch(() => ({ available: false }));
      setWeather(w);
      const rainy = rainOverride ?? !!w.rainy;
      const list: RecommendedCourse[] = [];
      for (let v = 0; v < 3; v++) {
        list.push(await recommendCourse({ center, hours, budget, mood, rainy, variant: v }));
        setResults([...list]);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function start_(r: RecommendedCourse) {
    if (!user) return loginKakao();
    const rainy = rainOverride ?? !!weather?.rainy;
    const place = origin ? origin.dong || origin.label : region;
    const id = await createCourse(user, {
      title: `${place} ${MOODS.find((m) => m.key === mood)?.label} 데이트`,
      region: place,
      date,
      startTime: start,
      mood,
      tags: rainy ? ["비오는날", "실내"] : [],
      stops: r.stops,
    });
    router.push(`/course/${id}/edit`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">조건으로 코스 추천받기</h1>
      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <div className="text-sm">
          <span className="text-stone-500">출발 위치</span>
          {origin ? (
            <div className="input mt-1 flex items-center gap-2 border-rose-300 bg-rose-50">
              <span className="flex-1 truncate">📍 {origin.label} <span className="text-xs text-stone-500">(현재 위치)</span></span>
              <button onClick={() => setOrigin(null)} className="text-stone-400 hover:text-stone-700" aria-label="현재 위치 해제">✕</button>
            </div>
          ) : (
            <div className="mt-1 flex gap-1.5">
              <input className="input" list="regions" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역 이름" />
              <datalist id="regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
              <button onClick={locate} disabled={locating} className="btn-ghost shrink-0 px-2.5" title="현재 위치 사용">
                {locating ? "…" : "📍 내 위치"}
              </button>
            </div>
          )}
        </div>
        <label className="text-sm">
          <span className="text-stone-500">날짜</span>
          <DateField className="mt-1" value={date} onChange={(v) => setDate(v || todayStr())} />
        </label>
        <label className="text-sm">
          <span className="text-stone-500">시작 시각</span>
          <DateField type="time" className="mt-1" value={start} onChange={(v) => v && setStart(v)} />
        </label>
        <label className="text-sm">
          <span className="text-stone-500">총 시간: {hours}시간</span>
          <input type="range" min={2} max={10} className="mt-3 w-full accent-rose-500" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          <span className="text-stone-500">예산(2인): {formatWon(budget)}</span>
          <input type="range" min={20000} max={300000} step={10000} className="mt-3 w-full accent-rose-500" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </label>
        <div className="text-sm">
          <span className="text-stone-500">날씨 반영</span>
          <div className="mt-1 flex gap-1">
            {([[null, "자동"], [false, "맑음 가정"], [true, "비 가정"]] as [boolean | null, string][]).map(([v, l]) => (
              <button key={l} onClick={() => setRainOverride(v)} className={`chip ${rainOverride === v ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="text-sm md:col-span-3">
          <span className="text-stone-500">분위기</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button key={m.key} onClick={() => setMood(m.key)} className={`chip ${mood === m.key ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200"}`}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => run()} disabled={loading} className="btn-primary md:col-span-3">{loading ? "코스 짜는 중…" : "✨ 코스 3개 추천받기"}</button>
      </div>

      {weather && <WeatherBadge w={weather} />}
      {err && <p className="text-red-500">{err}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {results.map((r, i) => (
          <div key={i} className="card overflow-hidden">
            <KakaoMap className="h-48" stops={r.stops} fitKey={`r${i}-${r.stops.map((s) => s.place.id).join()}`} />
            <div className="space-y-2 p-3">
              <p className="font-semibold">추천 {i + 1}</p>
              <ol className="space-y-1.5 text-sm">
                {r.stops.map((s, j) => (
                  <li key={s.uid}>
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        {j + 1}. {categoryOf(s.place.groupCode, s.place.category).emoji} {s.place.name}
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">{s.cost ? formatWon(s.cost) : "무료"}</span>
                    </div>
                    <p className="pl-4 text-xs text-stone-400">
                      {r.labels[j]}
                      {s.travel && ` · 다음까지 도보 ${s.travel.minutes}분`}
                    </p>
                  </li>
                ))}
              </ol>
              {/* 예산 사용량 */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className={r.overBudget ? "font-semibold text-amber-600" : "text-stone-500"}>
                    💰 {formatWon(r.totalCost)} / 예산 {formatWon(r.budget)}
                  </span>
                  <span className="text-stone-400">⏱ {formatDuration(r.totalMinutes)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-stone-100">
                  <div
                    className={`h-full ${r.overBudget ? "bg-amber-500" : "bg-rose-400"}`}
                    style={{ width: `${Math.min(100, Math.round((r.totalCost / Math.max(r.budget, 1)) * 100))}%` }}
                  />
                </div>
                {r.overBudget && <p className="mt-1 text-xs text-amber-600">가장 저렴한 구성으로도 예산을 넘어요. 예산을 올리거나 시간을 줄여 보세요.</p>}
              </div>
              <button onClick={() => start_(r)} className="btn-primary w-full">이 코스로 시작하기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RecommendPage() {
  return (
    <Suspense>
      <RecommendInner />
    </Suspense>
  );
}
