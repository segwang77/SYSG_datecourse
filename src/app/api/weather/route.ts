import { NextRequest, NextResponse } from "next/server";

const RAINY = new Set(["Rain", "Drizzle", "Thunderstorm", "Snow"]);

/**
 * OpenWeatherMap 5일 예보로 데이트 날짜·시간대의 날씨를 요약한다.
 * query: lat, lng, date(YYYY-MM-DD), start(HH:mm), hours(기본 6)
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const lat = p.get("lat");
  const lng = p.get("lng");
  const date = p.get("date");
  const start = p.get("start") ?? "12:00";
  const hours = Number(p.get("hours") ?? 6);
  if (!lat || !lng || !date) return NextResponse.json({ error: "missing params" }, { status: 400 });
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENWEATHER_API_KEY not set" }, { status: 500 });

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${key}&units=metric&lang=kr`,
    { next: { revalidate: 1800 } },
  );
  if (!res.ok) return NextResponse.json({ error: `weather ${res.status}` }, { status: 502 });
  const data = await res.json();

  // KST 기준 시작~종료 구간 (예보는 3시간 간격이라 앞뒤 1.5시간 여유)
  const from = new Date(`${date}T${start}:00+09:00`).getTime() - 90 * 60000;
  const to = from + (hours * 60 + 180) * 60000;
  type Item = { dt: number; main: { temp: number }; weather: { main: string; description: string; icon: string }[]; pop: number };
  const items: Item[] = (data.list ?? []).filter((it: Item) => it.dt * 1000 >= from && it.dt * 1000 <= to);
  if (!items.length) return NextResponse.json({ available: false });

  const temps = items.map((i) => i.main.temp);
  const rainy = items.some((i) => RAINY.has(i.weather[0]?.main) || i.pop >= 0.5);
  const worst = items.reduce((a, b) => (b.pop > a.pop ? b : a));
  return NextResponse.json({
    available: true,
    rainy,
    description: worst.weather[0]?.description ?? "",
    icon: worst.weather[0]?.icon ?? "01d",
    pop: Math.round(Math.max(...items.map((i) => i.pop)) * 100),
    minTemp: Math.round(Math.min(...temps)),
    maxTemp: Math.round(Math.max(...temps)),
  });
}
