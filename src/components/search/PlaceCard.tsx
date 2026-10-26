"use client";
import { categoryOf } from "@/lib/categories";
import { formatDistance, formatWon } from "@/lib/geo";
import type { Place } from "@/lib/types";

interface Props {
  place: Place;
  selected?: boolean;
  inCourse?: boolean;
  onSelect?: () => void;
  onAdd?: () => void;
  onCandidate?: () => void;
  onAround?: () => void;
}

export default function PlaceCard({ place, selected, inCourse, onSelect, onAdd, onCandidate, onAround }: Props) {
  const cat = categoryOf(place.groupCode, place.category);
  const sub = place.category.split(">").slice(-1)[0]?.trim();
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-3 transition ${selected ? "border-rose-400 bg-rose-50" : "border-stone-200 bg-white hover:border-stone-300"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {cat.emoji} {place.name}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {sub || cat.label}
            {place.distance != null && ` · ${formatDistance(place.distance)}`}
          </p>
          <p className="mt-0.5 truncate text-xs text-stone-400">{place.address}</p>
        </div>
        <span className={`chip shrink-0 ${cat.indoor ? "border-stone-200 text-stone-500" : "border-green-200 text-green-700"}`}>
          {cat.indoor ? "실내" : "실외"}
        </span>
      </div>
      {selected && (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-stone-500">
            예상 2인 {cat.defaultCost ? `~${formatWon(cat.defaultCost)}` : "무료"} · 보통 {cat.defaultStay}분 머묾
            {place.phone && ` · ${place.phone}`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onAdd && (
              <button onClick={onAdd} className="btn-primary px-2.5 py-1.5 text-xs" disabled={inCourse}>
                {inCourse ? "코스에 있음" : "+ 코스에 추가"}
              </button>
            )}
            {onCandidate && <button onClick={onCandidate} className="btn-ghost px-2.5 py-1.5 text-xs">후보로 투표 올리기</button>}
            {onAround && <button onClick={onAround} className="btn-ghost px-2.5 py-1.5 text-xs">주변 추천</button>}
            {place.url && (
              <a href={place.url} target="_blank" rel="noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs">
                사진·영업시간 ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
