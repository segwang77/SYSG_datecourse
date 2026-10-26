"use client";
import { useEffect, useState } from "react";
import { recommendAround, type NearbyGroup } from "@/lib/recommend";
import { formatDistance } from "@/lib/geo";
import type { Place, Stop } from "@/lib/types";

interface Props {
  anchor: Stop;
  excludeIds: string[];
  onInsert: (p: Place, where: "before" | "after") => void;
  onFocus: (p: Place) => void;
  onClose: () => void;
}

/** 확정한 장소(앵커) 전후로 갈 만한 근처 장소 추천 */
export default function AroundPanel({ anchor, excludeIds, onInsert, onFocus, onClose }: Props) {
  const [groups, setGroups] = useState<NearbyGroup[] | null>(null);
  useEffect(() => {
    setGroups(null);
    recommendAround(anchor.place, excludeIds).then(setGroups).catch(() => setGroups([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.uid]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">📌 {anchor.place.name} 주변 추천</p>
        <button onClick={onClose} className="text-xs text-stone-500">닫기</button>
      </div>
      {!groups && <p className="text-sm text-stone-400">찾는 중…</p>}
      {groups?.length === 0 && <p className="text-sm text-stone-400">근처에 추천할 곳이 없어요</p>}
      {groups?.map((g) => (
        <div key={g.category.key}>
          <p className="mb-1 text-xs font-semibold text-stone-500">{g.category.emoji} {g.category.label}</p>
          <ul className="space-y-1">
            {g.places.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm">
                <button onClick={() => onFocus(p)} className="min-w-0 flex-1 truncate text-left">
                  {p.name} <span className="text-xs text-stone-400">{p.distance != null && formatDistance(p.distance)}</span>
                </button>
                <button onClick={() => onInsert(p, "before")} className="text-xs text-stone-500 hover:text-rose-500">앞에</button>
                <button onClick={() => onInsert(p, "after")} className="text-xs text-rose-500">뒤에 +</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
