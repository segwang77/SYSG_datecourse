"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import KakaoMap from "@/components/map/KakaoMap";
import { useAuth } from "@/hooks/useAuth";
import { markDone, subscribeCourse, updateCourse } from "@/lib/courses";
import { computeTimeline, nowHHMM, toMin } from "@/lib/timeline";
import { haversine, formatDistance } from "@/lib/geo";
import { categoryOf } from "@/lib/categories";
import { kakaoRouteLink, naverRouteLink } from "@/lib/links";
import type { Course, LiveState } from "@/lib/types";

const EMPTY: LiveState = { currentIndex: 0, actualArrivals: {}, extraStay: {} };

/** 당일 모드: 현재 단계 강조, 다음 장소 길찾기, 지연 시 이후 일정 자동 재계산 */
export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [now, setNow] = useState(nowHHMM());

  useEffect(() => subscribeCourse(id, setCourse, () => setCourse(null)), [id, user]);
  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  const live = course?.live ?? EMPTY;
  const timeline = useMemo(() => (course ? computeTimeline(course.startTime, course.stops, live) : []), [course, live]);

  if (course === undefined) return <div className="p-10 text-center text-stone-400">불러오는 중…</div>;
  if (!course || !course.stops.length) return <div className="p-10 text-center text-stone-500">코스를 찾을 수 없어요</div>;

  const canEdit = !!user && course.members.includes(user.uid);
  const idx = Math.min(live.currentIndex, course.stops.length - 1);
  const cur = course.stops[idx];
  const next = course.stops[idx + 1];
  const t = timeline[idx];
  const save = (l: LiveState) => canEdit && updateCourse(course.id, { live: l });

  // 현재 시각 기준 예정 대비 지연 (현재 장소 출발 예정 시각과 비교)
  const lateBy = toMin(now) - t.departMin;
  const distToNext = me && next ? haversine(me.lat, me.lng, next.place.lat, next.place.lng) : null;
  const nearNext = distToNext != null && distToNext < 80;

  const arrive = (i: number) =>
    save({ ...live, currentIndex: i, actualArrivals: { ...live.actualArrivals, [course.stops[i].uid]: nowHHMM() } });
  const extend = (mins: number) =>
    save({ ...live, extraStay: { ...live.extraStay, [cur.uid]: (live.extraStay[cur.uid] ?? 0) + mins } });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">▶ {course.title}</h1>
        <Link href={`/c/${course.id}`} className="text-sm text-stone-500">나가기</Link>
      </div>

      <KakaoMap
        className="h-64 overflow-hidden rounded-xl"
        stops={course.stops}
        activeStopUid={cur.uid}
        doneStopUids={course.stops.slice(0, idx).map((s) => s.uid)}
        myLocation={me}
        center={{ lat: cur.place.lat, lng: cur.place.lng }}
      />

      {/* 현재 단계 */}
      <section className="card border-rose-300 p-4 ring-4 ring-rose-50">
        <p className="text-xs font-semibold text-rose-500">지금 · {idx + 1}/{course.stops.length}</p>
        <p className="mt-1 text-xl font-bold">{categoryOf(cur.place.groupCode, cur.place.category).emoji} {cur.place.name}</p>
        <p className="text-sm text-stone-500">
          {t.arrive}{t.actual ? " (실제 도착)" : ""} ~ {t.depart} 출발 예정
          {lateBy > 0 && <span className="ml-1 font-semibold text-amber-600">· 예정보다 {lateBy}분 지남</span>}
        </p>
        {cur.memo && <p className="mt-1 text-sm text-amber-700">📝 {cur.memo}</p>}
        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            {!live.actualArrivals[cur.uid] && <button className="btn-primary" onClick={() => arrive(idx)}>📍 도착했어요</button>}
            <button className="btn-ghost" onClick={() => extend(10)}>+10분 더 있을래요</button>
            <button className="btn-ghost" onClick={() => extend(-10)}>-10분</button>
          </div>
        )}
      </section>

      {/* 다음 장소 */}
      {next ? (
        <section className="card p-4">
          <p className="text-xs font-semibold text-stone-500">다음 · {timeline[idx + 1].arrive} 도착 예정</p>
          <p className="mt-1 text-lg font-semibold">{next.place.name}</p>
          <p className="text-sm text-stone-500">
            {cur.travel ? `${cur.travel.minutes}분 이동` : ""}
            {distToNext != null && ` · 지금 위치에서 ${formatDistance(Math.round(distToNext))}`}
          </p>
          {nearNext && canEdit && (
            <p className="mt-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">
              근처에 도착한 것 같아요!{" "}
              <button className="font-semibold underline" onClick={() => arrive(idx + 1)}>도착 처리</button>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn bg-[#FEE500] text-black" href={kakaoRouteLink(next.place)} target="_blank" rel="noreferrer">카카오맵 길찾기</a>
            <a className="btn bg-[#03C75A] text-white" href={naverRouteLink(next.place)}>네이버지도 앱</a>
            {canEdit && <button className="btn-ghost" onClick={() => arrive(idx + 1)}>다음 장소 도착 →</button>}
          </div>
        </section>
      ) : (
        canEdit && (
          <button className="btn-primary py-3" onClick={() => markDone(course.id, true)}>
            {course.status === "done" ? "기록장에 저장됨 💕" : "🎉 데이트 완료! 기록장에 저장"}
          </button>
        )
      )}

      {/* 전체 일정 (재계산된 시간) */}
      <section className="card divide-y divide-stone-100">
        {course.stops.map((s, i) => (
          <div key={s.uid} className={`flex items-center gap-3 p-3 text-sm ${i < idx ? "text-stone-400" : ""} ${i === idx ? "bg-rose-50" : ""}`}>
            <span className="w-24 shrink-0 font-mono">{timeline[i].arrive}~{timeline[i].depart}</span>
            <span className="flex-1 truncate">{i < idx ? "✔ " : ""}{s.place.name}</span>
            {timeline[i].actual && <span className="text-xs text-rose-500">실제</span>}
            {(live.extraStay[s.uid] ?? 0) !== 0 && <span className="text-xs text-amber-600">{live.extraStay[s.uid] > 0 ? "+" : ""}{live.extraStay[s.uid]}분</span>}
          </div>
        ))}
      </section>

      {canEdit && (
        <button className="text-sm text-stone-400 underline" onClick={() => confirm("당일 기록을 초기화할까요?") && save(EMPTY)}>
          당일 기록 초기화
        </button>
      )}
    </div>
  );
}
