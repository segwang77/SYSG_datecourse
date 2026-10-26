"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { JS_KEY, loadKakaoMap } from "@/lib/kakao";
import { categoryOf } from "@/lib/categories";
import type { Place, Stop } from "@/lib/types";

export interface MapCircle {
  lat: number;
  lng: number;
  count: number;
  label: string;
}

interface Props {
  className?: string;
  center?: { lat: number; lng: number };
  level?: number;
  stops?: Stop[];
  activeStopUid?: string | null;
  doneStopUids?: string[];
  onStopClick?: (uid: string) => void;
  places?: Place[];
  selectedPlaceId?: string | null;
  onPlaceClick?: (p: Place) => void;
  circles?: MapCircle[];
  pick?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  myLocation?: { lat: number; lng: number } | null;
  fitKey?: string; // 값이 바뀔 때마다 코스 전체가 보이도록 맞춤
  onReady?: (map: any) => void;
  onIdle?: (map: any) => void;
}

const DEFAULT_CENTER = { lat: 37.5445, lng: 127.0557 }; // 성수

export default function KakaoMap(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const stopLayer = useRef<any[]>([]);
  const placeLayer = useRef<any[]>([]);
  const circleLayer = useRef<any[]>([]);
  const pickLayer = useRef<any>(null);
  const meLayer = useRef<any>(null);
  const cbs = useRef(props);
  cbs.current = props;

  // 지도 생성
  useEffect(() => {
    let cancelled = false;
    setError(null);
    loadKakaoMap()
      .then((kakao) => {
        if (cancelled || !el.current) return;
        const c = props.center ?? DEFAULT_CENTER;
        const map = new kakao.maps.Map(el.current, { center: new kakao.maps.LatLng(c.lat, c.lng), level: props.level ?? 5 });
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
        kakao.maps.event.addListener(map, "click", (e: any) => cbs.current.onMapClick?.(e.latLng.getLat(), e.latLng.getLng()));
        kakao.maps.event.addListener(map, "idle", () => cbs.current.onIdle?.(map));
        mapRef.current = map;
        setReady(true);
        cbs.current.onReady?.(map);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // 컨테이너 크기 변화 대응 (모바일 바텀시트 등)
  useEffect(() => {
    if (!ready || !el.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.relayout());
    ro.observe(el.current);
    return () => ro.disconnect();
  }, [ready]);

  // 중심 이동
  useEffect(() => {
    if (!ready || !props.center) return;
    const { kakao } = window;
    mapRef.current.panTo(new kakao.maps.LatLng(props.center.lat, props.center.lng));
  }, [ready, props.center?.lat, props.center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // 코스: 번호 마커 + 경로선
  useEffect(() => {
    if (!ready) return;
    const { kakao } = window;
    const map = mapRef.current;
    stopLayer.current.forEach((o) => o.setMap(null));
    stopLayer.current = [];
    const stops = props.stops ?? [];

    stops.forEach((s, i) => {
      const div = document.createElement("div");
      const done = props.doneStopUids?.includes(s.uid);
      div.className = `stop-marker${props.activeStopUid === s.uid ? " active" : ""}${done ? " done" : ""}`;
      div.textContent = String(i + 1);
      div.title = s.place.name;
      div.onclick = () => cbs.current.onStopClick?.(s.uid);
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(s.place.lat, s.place.lng), content: div, yAnchor: 0.5, zIndex: 5 });
      ov.setMap(map);
      stopLayer.current.push(ov);

      const next = stops[i + 1];
      if (next) {
        const flat = s.travelMode === "car" && s.travel?.path && s.travel.path.length >= 4 ? s.travel.path : null;
        const pairs: [number, number][] = [];
        if (flat) for (let k = 0; k + 1 < flat.length; k += 2) pairs.push([flat[k], flat[k + 1]]);
        else pairs.push([s.place.lat, s.place.lng], [next.place.lat, next.place.lng]);
        const path = pairs.map(([la, ln]) => new kakao.maps.LatLng(la, ln));
        const line = new kakao.maps.Polyline({
          path,
          strokeWeight: 4,
          strokeColor: s.travelMode === "walk" ? "#f43f5e" : s.travelMode === "transit" ? "#2563eb" : "#16a34a",
          strokeOpacity: 0.85,
          strokeStyle: s.travelMode === "walk" ? "shortdash" : "solid",
        });
        line.setMap(map);
        stopLayer.current.push(line);
      }
    });
  }, [ready, props.stops, props.activeStopUid, props.doneStopUids]);

  // 코스 전체 보기
  useEffect(() => {
    if (!ready || !props.fitKey) return;
    const stops = props.stops ?? [];
    if (!stops.length) return;
    const { kakao } = window;
    const bounds = new kakao.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(new kakao.maps.LatLng(s.place.lat, s.place.lng)));
    if (stops.length === 1) mapRef.current.setCenter(new kakao.maps.LatLng(stops[0].place.lat, stops[0].place.lng));
    else mapRef.current.setBounds(bounds, 60, 60, 60, 60);
  }, [ready, props.fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 결과 마커
  useEffect(() => {
    if (!ready) return;
    const { kakao } = window;
    placeLayer.current.forEach((o) => o.setMap(null));
    placeLayer.current = [];
    (props.places ?? []).forEach((p) => {
      const cat = categoryOf(p.groupCode, p.category);
      const div = document.createElement("div");
      const selected = props.selectedPlaceId === p.id;
      div.className = `place-dot${selected ? " selected" : ""}`;
      div.style.borderColor = cat.color;
      div.style.background = selected ? cat.color : "white";
      div.style.color = selected ? "white" : "#1c1917";
      div.textContent = `${cat.emoji} ${p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name}`;
      div.onclick = () => cbs.current.onPlaceClick?.(p);
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(p.lat, p.lng), content: div, yAnchor: 1.2, zIndex: selected ? 4 : 2 });
      ov.setMap(mapRef.current);
      placeLayer.current.push(ov);
    });
  }, [ready, props.places, props.selectedPlaceId]);

  // 방문 기록 원 (방문 횟수에 비례)
  useEffect(() => {
    if (!ready) return;
    const { kakao } = window;
    circleLayer.current.forEach((o) => o.setMap(null));
    circleLayer.current = [];
    (props.circles ?? []).forEach((c) => {
      const circle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(c.lat, c.lng),
        radius: 60 + c.count * 50,
        strokeWeight: 1,
        strokeColor: "#e11d48",
        strokeOpacity: 0.6,
        fillColor: "#f43f5e",
        fillOpacity: Math.min(0.15 + c.count * 0.12, 0.7),
      });
      circle.setMap(mapRef.current);
      circleLayer.current.push(circle);
    });
  }, [ready, props.circles]);

  // 위치 선택 마커 (명소 제보)
  useEffect(() => {
    if (!ready) return;
    const { kakao } = window;
    pickLayer.current?.setMap(null);
    if (props.pick) {
      pickLayer.current = new kakao.maps.Marker({ position: new kakao.maps.LatLng(props.pick.lat, props.pick.lng) });
      pickLayer.current.setMap(mapRef.current);
    }
  }, [ready, props.pick]);

  // 내 위치 (당일 모드)
  useEffect(() => {
    if (!ready) return;
    const { kakao } = window;
    meLayer.current?.setMap(null);
    if (props.myLocation) {
      const div = document.createElement("div");
      div.style.cssText = "width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,.25)";
      meLayer.current = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(props.myLocation.lat, props.myLocation.lng), content: div, zIndex: 6 });
      meLayer.current.setMap(mapRef.current);
    }
  }, [ready, props.myLocation]);

  return (
    <div className={`relative ${props.className ?? ""}`}>
      <div ref={el} className="h-full w-full" />
      {error && (
        <div className="absolute inset-0 overflow-y-auto bg-stone-100 p-4 text-sm text-stone-600">
          <p className="font-semibold text-stone-800">지도를 불러오지 못했어요</p>
          {!JS_KEY ? (
            <p className="mt-2">
              <b>JavaScript 키가 비어 있어요.</b> <code>.env.local</code>에 <code>NEXT_PUBLIC_KAKAO_JS_KEY</code>를 넣고 개발 서버를 재시작하세요.
            </p>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>카카오 콘솔 → <b>카카오맵 → 사용 설정</b>이 ON인가요?</li>
              <li>
                <b>앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인</b>에{" "}
                <code className="rounded bg-white px-1">{typeof window !== "undefined" ? window.location.origin : ""}</code> 가 정확히 등록돼 있나요?
              </li>
              <li>
                사용 중인 키 <code className="rounded bg-white px-1">{JS_KEY.slice(0, 6)}…{JS_KEY.slice(-4)}</code> 가 <b>JavaScript 키</b>와 같나요? (REST API 키 X)
              </li>
              <li>광고 차단 확장 프로그램이 <code>dapi.kakao.com</code>을 막고 있지 않나요?</li>
            </ol>
          )}
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-ghost mt-3">다시 시도</button>
        </div>
      )}
    </div>
  );
}
