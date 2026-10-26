"use client";
import { useEffect, useState } from "react";

export interface WeatherInfo {
  available: boolean;
  rainy?: boolean;
  description?: string;
  icon?: string;
  pop?: number;
  minTemp?: number;
  maxTemp?: number;
}

export function useWeather(lat?: number, lng?: number, date?: string | null, start?: string, hours?: number) {
  const [w, setW] = useState<WeatherInfo | null>(null);
  useEffect(() => {
    if (lat == null || lng == null || !date) {
      setW(null);
      return;
    }
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), date, start: start ?? "12:00", hours: String(hours ?? 6) });
    fetch(`/api/weather?${qs}`)
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then(setW)
      .catch(() => setW({ available: false }));
  }, [lat, lng, date, start, hours]);
  return w;
}

export default function WeatherBadge({ w }: { w: WeatherInfo | null }) {
  if (!w) return null;
  if (!w.available) return <span className="chip border-stone-200 text-stone-400">날씨: 5일 이내 날짜만 예보</span>;
  return (
    <span className={`chip ${w.rainy ? "border-blue-300 bg-blue-50 text-blue-700" : "border-stone-200"}`}>
      <img src={`https://openweathermap.org/img/wn/${w.icon}.png`} alt="" className="-my-1 h-6 w-6" />
      {w.description} {w.minTemp}~{w.maxTemp}° · 강수 {w.pop}%
    </span>
  );
}
