"use client";
import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { categoryOf } from "@/lib/categories";
import { formatDistance, formatWon } from "@/lib/geo";
import { reservationLinks } from "@/lib/links";
import type { Stop, TimelineEntry, TravelMode } from "@/lib/types";

interface Props {
  stops: Stop[];
  timeline: TimelineEntry[];
  activeUid: string | null;
  readOnly?: boolean;
  onReorder: (stops: Stop[]) => void;
  onPatch: (uid: string, patch: Partial<Stop>) => void;
  onRemove: (uid: string) => void;
  onFocus: (uid: string) => void;
  onAround: (uid: string) => void;
}

export default function StopList(props: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = props.stops.findIndex((s) => s.uid === active.id);
    const to = props.stops.findIndex((s) => s.uid === over.id);
    props.onReorder(arrayMove(props.stops, from, to));
  }

  if (!props.stops.length)
    return <p className="py-10 text-center text-sm text-stone-400">검색 탭에서 장소를 골라 코스에 추가해 보세요</p>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={props.stops.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-0">
          {props.stops.map((s, i) => (
            <StopItem key={s.uid} index={i} stop={s} time={props.timeline[i]} isLast={i === props.stops.length - 1} {...props} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

const MODES: { key: TravelMode; label: string }[] = [
  { key: "walk", label: "🚶 도보" },
  { key: "transit", label: "🚇 대중교통" },
  { key: "car", label: "🚗 차" },
];

function StopItem({ stop, index, time, isLast, activeUid, readOnly, onPatch, onRemove, onFocus, onAround }: Props & { stop: Stop; index: number; time?: TimelineEntry; isLast: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.uid, disabled: readOnly });
  const [memo, setMemo] = useState(stop.memo);
  const [open, setOpen] = useState(false);
  useEffect(() => setMemo(stop.memo), [stop.memo]); // 공동 편집자의 변경 반영
  const cat = categoryOf(stop.place.groupCode, stop.place.category);
  const active = activeUid === stop.uid;

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10 opacity-80" : ""}>
      <div className={`card p-3 ${active ? "border-rose-400 ring-2 ring-rose-100" : ""}`} onClick={() => onFocus(stop.uid)}>
        <div className="flex items-start gap-2">
          {!readOnly && (
            <button {...attributes} {...listeners} className="mt-0.5 cursor-grab touch-none px-1 text-stone-400" aria-label="순서 바꾸기">
              ⋮⋮
            </button>
          )}
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{cat.emoji} {stop.place.name}</p>
            <p className="text-xs text-stone-500">
              {time ? `${time.arrive} ~ ${time.depart}` : ""} · {stop.stayMinutes}분 · {stop.cost ? formatWon(stop.cost) : "무료"}
            </p>
            {stop.memo && !open && <p className="mt-1 truncate text-xs text-amber-700">📝 {stop.memo}</p>}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="text-xs text-stone-500 hover:text-stone-800">
            {open ? "접기" : "편집"}
          </button>
        </div>

        {open && (
          <div className="mt-3 space-y-2 border-t border-stone-100 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-stone-500">
                머무는 시간(분)
                <input key={`stay-${stop.stayMinutes}`} type="number" min={10} step={10} className="input mt-1" disabled={readOnly} defaultValue={stop.stayMinutes}
                  onBlur={(e) => onPatch(stop.uid, { stayMinutes: Math.max(0, Number(e.target.value) || 0) })} />
              </label>
              <label className="text-xs text-stone-500">
                예상 비용(2인)
                <input key={`cost-${stop.cost}`} type="number" min={0} step={1000} className="input mt-1" disabled={readOnly} defaultValue={stop.cost}
                  onBlur={(e) => onPatch(stop.uid, { cost: Math.max(0, Number(e.target.value) || 0) })} />
              </label>
            </div>
            <label className="block text-xs text-stone-500">
              메모
              <textarea className="input mt-1" rows={2} disabled={readOnly} placeholder="예: 창가 자리 예약함" value={memo}
                onChange={(e) => setMemo(e.target.value)} onBlur={() => memo !== stop.memo && onPatch(stop.uid, { memo })} />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {stop.place.url && <a href={stop.place.url} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">카카오맵 ↗</a>}
              {reservationLinks(stop.place).map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs">{l.label} ↗</a>
              ))}
              {!readOnly && <button onClick={() => onAround(stop.uid)} className="btn-ghost px-2 py-1 text-xs">주변 추천</button>}
              {!readOnly && <button onClick={() => onRemove(stop.uid)} className="btn-ghost px-2 py-1 text-xs text-red-500">삭제</button>}
            </div>
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex items-center gap-2 py-1.5 pl-9 text-xs text-stone-500">
          <span className="h-6 border-l-2 border-dashed border-stone-300" />
          {readOnly ? (
            <span>{MODES.find((m) => m.key === stop.travelMode)?.label}</span>
          ) : (
            <select value={stop.travelMode} onChange={(e) => onPatch(stop.uid, { travelMode: e.target.value as TravelMode, travel: null })}
              className="rounded border border-stone-200 bg-white px-1.5 py-0.5">
              {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          )}
          {stop.travel ? (
            <span>
              {stop.travel.minutes}분 · {formatDistance(stop.travel.meters)}
              {stop.travel.fare ? ` · 1인 ${formatWon(stop.travel.fare)}` : ""}
              {stop.travel.estimated && <span className="text-amber-600"> (추정)</span>}
              {stop.travel.note && <span className="text-sky-600"> · {stop.travel.note}</span>}
            </span>
          ) : (
            <span className="text-stone-400">계산 중…</span>
          )}
        </div>
      )}
    </li>
  );
}
