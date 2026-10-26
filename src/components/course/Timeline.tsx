"use client";
import { categoryOf } from "@/lib/categories";
import { formatDistance, formatWon } from "@/lib/geo";
import { kakaoRouteLink, reservationLinks } from "@/lib/links";
import type { Stop, TimelineEntry } from "@/lib/types";

const MODE_LABEL = { walk: "🚶 도보", transit: "🚇 대중교통", car: "🚗 차" };

/** 읽기 전용 타임라인 (공유 페이지) */
export default function Timeline({ stops, timeline, onFocus }: { stops: Stop[]; timeline: TimelineEntry[]; onFocus?: (uid: string) => void }) {
  return (
    <ol className="relative space-y-0">
      {stops.map((s, i) => {
        const t = timeline[i];
        const cat = categoryOf(s.place.groupCode, s.place.category);
        return (
          <li key={s.uid}>
            <div className="flex gap-3">
              <div className="w-12 shrink-0 pt-1 text-right text-sm font-semibold text-stone-700">{t?.arrive}</div>
              <div className="card flex-1 p-3" onClick={() => onFocus?.(s.uid)}>
                <p className="font-semibold">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs text-white">{i + 1}</span>
                  {cat.emoji} {s.place.name}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {t?.arrive}~{t?.depart} · {s.stayMinutes}분 · {s.cost ? formatWon(s.cost) : "무료"}
                </p>
                <p className="text-xs text-stone-400">{s.place.address}</p>
                {s.memo && <p className="mt-1 text-xs text-amber-700">📝 {s.memo}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.place.url && <a className="btn-ghost px-2 py-1 text-xs" href={s.place.url} target="_blank" rel="noreferrer">장소 정보 ↗</a>}
                  <a className="btn-ghost px-2 py-1 text-xs" href={kakaoRouteLink(s.place)} target="_blank" rel="noreferrer">길찾기 ↗</a>
                  {reservationLinks(s.place).map((l) => (
                    <a key={l.label} className="btn-ghost px-2 py-1 text-xs" href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>
                  ))}
                </div>
              </div>
            </div>
            {i < stops.length - 1 && (
              <p className="py-2 pl-16 text-xs text-stone-500">
                ↓ {MODE_LABEL[s.travelMode]} {s.travel ? `${s.travel.minutes}분 · ${formatDistance(s.travel.meters)}` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
