"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import KakaoMap from "@/components/map/KakaoMap";
import PlaceSearch from "@/components/search/PlaceSearch";
import StopList from "./StopList";
import CourseMetaForm from "./CourseMetaForm";
import CandidatePanel from "./CandidatePanel";
import AroundPanel from "./AroundPanel";
import ShareButtons from "@/components/course/ShareButtons";
import WeatherBadge, { useWeather } from "@/components/WeatherBadge";
import { addCandidate, deleteCourse, markDone, newStop, subscribeCourse, updateCourse } from "@/lib/courses";
import { refreshTravels } from "@/lib/routing";
import { computeTimeline, totalCost, totalMinutes } from "@/lib/timeline";
import { formatDuration, formatWon } from "@/lib/geo";
import { indoorAlternatives, isOutdoor } from "@/lib/recommend";
import type { Course, Place, Stop } from "@/lib/types";

type Tab = "search" | "course" | "vote" | "settings";

/** 모바일에서 지도가 차지하는 높이 (PC에서는 항상 전체 높이) */
type MapSize = "hidden" | "normal" | "large";
const MAP_HEIGHT: Record<MapSize, string> = { hidden: "0px", normal: "30dvh", large: "55dvh" };
const MAP_SIZE_LABEL: [MapSize, string][] = [["hidden", "숨김"], ["normal", "기본"], ["large", "크게"]];

/** stops 에서 이동정보를 뺀 서명 — 이동정보 계산 중 다른 편집이 있었는지 감지 */
const signature = (stops: Stop[]) => JSON.stringify(stops.map(({ travel: _t, ...rest }) => rest)); // eslint-disable-line @typescript-eslint/no-unused-vars

export default function CourseEditor({ courseId, user }: { courseId: string; user: User }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // 편집을 막지 않는 경고
  const [tab, setTab] = useState<Tab>("search");
  const [map, setMap] = useState<any>(null);
  const [mapMovedAt, setMapMovedAt] = useState(0);
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [anchorUid, setAnchorUid] = useState<string | null>(null);
  const [rainFor, setRainFor] = useState<{ uid: string; alts: Place[] | null } | null>(null);
  const [fitKey, setFitKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSize, setMapSize] = useState<MapSize>("normal");
  const latest = useRef<Stop[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /** 탭 전환. 모바일에서 아래로 스크롤한 상태였다면 새 탭의 맨 위부터 보이게 한다. */
  const switchTab = (k: Tab) => {
    setTab(k);
    requestAnimationFrame(() => {
      const nav = navRef.current;
      const content = contentRef.current;
      if (!nav || !content || window.matchMedia("(min-width: 768px)").matches) return;
      if (content.getBoundingClientRect().top < nav.getBoundingClientRect().bottom) content.scrollIntoView({ block: "start" });
    });
  };

  useEffect(
    () =>
      subscribeCourse(
        courseId,
        (c) => {
          setCourse(c);
          if (c) latest.current = c.stops;
        },
        (e) => setError(e.message.includes("permission") ? "이 코스를 편집할 권한이 없어요" : e.message),
      ),
    [courseId],
  );

  // 처음 로드 시 코스 전체가 보이게
  useEffect(() => {
    if (course && !fitKey && course.stops.length) setFitKey("init");
  }, [course, fitKey]);

  // 이동 정보(도보/대중교통/자동차) 자동 계산
  const stopsSig = course ? signature(course.stops) : "";
  useEffect(() => {
    if (!course || course.stops.length < 1) return;
    const before = signature(course.stops);
    refreshTravels(course.stops).then(({ stops, changed }) => {
      if (changed && signature(latest.current) === before)
        updateCourse(courseId, { stops }).catch((e) => setNotice(`이동 정보를 저장하지 못했어요: ${(e as Error).message}`));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsSig]);

  const save = useCallback(
    async (patch: Partial<Course>) => {
      setSaving(true);
      try {
        await updateCourse(courseId, patch);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [courseId],
  );

  const setStops = (stops: Stop[]) => {
    latest.current = stops;
    save({ stops });
  };

  const stops = course?.stops ?? [];
  const timeline = useMemo(() => computeTimeline(course?.startTime ?? "12:00", stops), [course?.startTime, stops]);
  const first = stops[0]?.place;
  const weather = useWeather(first?.lat, first?.lng, course?.date, course?.startTime, Math.ceil(totalMinutes(stops) / 60) || 4);
  const outdoorStops = stops.filter(isOutdoor);

  if (error) return <div className="p-10 text-center text-stone-500">{error}</div>;
  if (course === undefined) return <div className="p-10 text-center text-stone-400">불러오는 중…</div>;
  if (course === null) return <div className="p-10 text-center text-stone-500">코스를 찾을 수 없어요</div>;
  if (!course.members.includes(user.uid))
    return (
      <div className="p-10 text-center text-stone-500">
        편집 권한이 없어요. <Link className="text-rose-500 underline" href={`/c/${course.id}`}>코스 보기</Link>
      </div>
    );

  const addPlace = (p: Place) => {
    if (stops.some((s) => s.place.id === p.id)) return;
    setStops([...stops, newStop(p)]);
    setFitKey(String(Date.now()));
  };
  const insertPlace = (p: Place, anchor: string, where: "before" | "after") => {
    const idx = stops.findIndex((s) => s.uid === anchor);
    const next = [...stops];
    next.splice(where === "before" ? idx : idx + 1, 0, newStop(p));
    setStops(next);
    setFitKey(String(Date.now()));
  };
  const focusPlace = (p: Place) => {
    setSelected(p);
    if (!results.some((r) => r.id === p.id)) setResults((r) => [...r, p]);
    map?.panTo(new window.kakao.maps.LatLng(p.lat, p.lng));
  };
  const focusStop = (uid: string) => {
    setActiveUid(uid);
    const s = stops.find((x) => x.uid === uid);
    if (s) map?.panTo(new window.kakao.maps.LatLng(s.place.lat, s.place.lng));
  };
  const openRainAlt = async (s: Stop) => {
    setRainFor({ uid: s.uid, alts: null });
    setRainFor({ uid: s.uid, alts: await indoorAlternatives(s.place) });
  };

  const anchor = stops.find((s) => s.uid === anchorUid);
  const mins = totalMinutes(stops);
  const end = timeline[timeline.length - 1]?.depart;

  return (
    // 모바일: 페이지 전체가 스크롤되고 지도·탭만 위에 고정 / PC(md 이상): 화면 높이에 맞춘 좌우 분할
    <div
      className="flex flex-col md:h-[calc(100dvh-56px)] md:flex-row"
      style={{ "--map-h": MAP_HEIGHT[mapSize] } as React.CSSProperties}
    >
      {/* 지도 */}
      <div className={`sticky top-14 z-20 order-1 h-[var(--map-h)] shrink-0 overflow-hidden border-stone-200 md:static md:order-2 md:h-full md:flex-1 md:border-0 ${mapSize === "hidden" ? "" : "border-b"}`}>
        <KakaoMap
          className="h-full w-full"
          center={first ? { lat: first.lat, lng: first.lng } : undefined}
          stops={stops}
          activeStopUid={activeUid}
          onStopClick={(uid) => { setTab("course"); setActiveUid(uid); }}
          places={tab === "search" || anchor ? results : []}
          selectedPlaceId={selected?.id}
          onPlaceClick={(p) => { setSelected(p); setTab("search"); }}
          fitKey={fitKey}
          myLocation={myLocation}
          onReady={setMap}
          onIdle={() => setMapMovedAt(Date.now())}
        />
      </div>

      {/* 패널 */}
      <aside className="order-2 flex flex-col border-stone-200 bg-stone-50 md:order-1 md:min-h-0 md:w-[420px] md:flex-none md:border-r">
        <div className="border-b border-stone-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 flex-1 truncate font-bold">{course.title}</h1>
            <span className="shrink-0 text-xs text-stone-400">{saving ? "저장 중…" : "저장됨"}</span>
            <Link href={`/c/${course.id}`} className="btn-ghost shrink-0 px-2 py-1 text-xs">미리보기</Link>
          </div>
          {/* 모바일 전용: 지도 크기 조절 */}
          <div className="mt-2 flex items-center gap-2 text-xs md:hidden">
            <span className="text-stone-500">지도</span>
            <div className="flex overflow-hidden rounded-lg border border-stone-200">
              {MAP_SIZE_LABEL.map(([size, label]) => (
                <button
                  key={size}
                  onClick={() => setMapSize(size)}
                  aria-pressed={mapSize === size}
                  className={`px-3 py-1.5 ${mapSize === size ? "bg-stone-800 text-white" : "bg-white text-stone-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
            <span className="chip border-stone-200">🕐 {course.startTime}{end ? ` ~ ${end}` : ""}</span>
            <span className="chip border-stone-200">⏱ {formatDuration(mins)}</span>
            <span className="chip border-stone-200">💰 {formatWon(totalCost(stops))}</span>
            <WeatherBadge w={weather} />
          </div>
          {notice && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice(null)}>✕</button>
            </div>
          )}
          {weather?.rainy && outdoorStops.length > 0 && (
            <div className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
              ☔ 비 예보가 있어요. 실외 장소 {outdoorStops.length}곳의 실내 대안:
              <div className="mt-1 flex flex-wrap gap-1">
                {outdoorStops.map((s) => (
                  <button key={s.uid} onClick={() => { setTab("course"); openRainAlt(s); }} className="rounded bg-white px-2 py-0.5 underline">
                    {s.place.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav ref={navRef} className="sticky top-[calc(56px+var(--map-h))] z-10 flex border-b border-stone-200 bg-white text-[13px] md:static md:text-sm">
          {([
            ["search", "🔍", "장소 찾기"],
            ["course", "🗺️", `코스 ${stops.length}`],
            ["vote", "🗳️", "후보 투표"],
            ["settings", "⚙️", "설정·공유"],
          ] as [Tab, string, string][]).map(([k, emoji, label]) => (
            <button key={k} onClick={() => switchTab(k)} className={`flex-1 whitespace-nowrap px-1 py-3 md:py-2.5 ${tab === k ? "border-b-2 border-rose-500 font-semibold text-rose-600" : "text-stone-500"}`}>
              <span className="hidden min-[400px]:inline">{emoji} </span>
              {label}
            </button>
          ))}
        </nav>

        {/* 모바일: 내용 길이만큼 늘어나 페이지가 스크롤됨 / PC: 패널 안에서 스크롤 */}
        <div ref={contentRef} className="scroll-mt-[calc(56px+var(--map-h)+46px)] p-3 pb-24 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-3">
          <div className={tab === "search" ? "md:h-full" : "hidden"}>
            <PlaceSearch
              map={map}
              mapMovedAt={mapMovedAt}
              selectedId={selected?.id ?? null}
              courseIds={stops.map((s) => s.place.id)}
              onResults={setResults}
              onLocate={setMyLocation}
              onSelect={focusPlace}
              onAdd={addPlace}
              onCandidate={(p) => { addCandidate(course.id, p, user); setTab("vote"); }}
              onAround={(p) => {
                // 검색 결과 기준 주변 추천: 코스에 먼저 넣고 앵커로 지정
                const s = newStop(p);
                setStops([...stops, s]);
                setAnchorUid(s.uid);
                setTab("course");
              }}
            />
          </div>

          {tab === "course" && (
            <div className="space-y-3">
              {anchor && (
                <div className="card p-3">
                  <AroundPanel
                    anchor={anchor}
                    excludeIds={stops.map((s) => s.place.id)}
                    onInsert={(p, where) => insertPlace(p, anchor.uid, where)}
                    onFocus={focusPlace}
                    onClose={() => setAnchorUid(null)}
                  />
                </div>
              )}
              {rainFor && (
                <div className="card space-y-2 p-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>☔ 실내 대안</span>
                    <button onClick={() => setRainFor(null)} className="text-xs font-normal text-stone-500">닫기</button>
                  </div>
                  {!rainFor.alts && <p className="text-sm text-stone-400">찾는 중…</p>}
                  {rainFor.alts?.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => focusPlace(p)} className="min-w-0 flex-1 truncate text-left">{p.name}</button>
                      <button
                        className="text-xs text-rose-500"
                        onClick={() => {
                          setStops(stops.map((s) => (s.uid === rainFor.uid ? { ...newStop(p), uid: s.uid, travelMode: s.travelMode, memo: s.memo } : s)));
                          setRainFor(null);
                        }}
                      >
                        교체
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <StopList
                stops={stops}
                timeline={timeline}
                activeUid={activeUid}
                onReorder={setStops}
                onPatch={(uid, patch) => setStops(stops.map((s) => (s.uid === uid ? { ...s, ...patch } : s)))}
                onRemove={(uid) => setStops(stops.filter((s) => s.uid !== uid))}
                onFocus={focusStop}
                onAround={(uid) => setAnchorUid(uid)}
              />
              {stops.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href={`/c/${course.id}/live`} className="btn-primary flex-1">▶ 당일 모드</Link>
                  <button className="btn-ghost flex-1" onClick={() => markDone(course.id, course.status !== "done")}>
                    {course.status === "done" ? "완료 취소" : "✔ 다녀왔어요 (기록장)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "vote" && (
            <CandidatePanel courseId={course.id} user={user} memberCount={course.members.length}
              onConfirm={(p) => { addPlace(p); setTab("course"); }} onFocus={focusPlace} />
          )}

          {tab === "settings" && (
            <div className="space-y-6">
              <CourseMetaForm course={course} onChange={save} />
              <div>
                <p className="mb-2 text-sm text-stone-500">공유 · 초대 (현재 편집자 {course.members.length}명)</p>
                <ShareButtons course={course} showInvite onMakeLinkVisible={() => save({ visibility: "link" })} />
              </div>
              {course.ownerId === user.uid && (
                <button
                  className="text-sm text-red-500 underline"
                  onClick={async () => {
                    if (!confirm("코스를 삭제할까요? 되돌릴 수 없어요.")) return;
                    await deleteCourse(course.id);
                    router.push("/me");
                  }}
                >
                  코스 삭제
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
