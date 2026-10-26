"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, SPOT_CATEGORY, categoryOf } from "@/lib/categories";
import { keywordSearch, searchByCategory } from "@/lib/kakao";
import { listSpots, spotToPlace } from "@/lib/spots";
import { getCurrentPosition } from "@/lib/location";
import type { Place } from "@/lib/types";
import PlaceCard from "./PlaceCard";

interface Props {
  map: any | null;
  mapMovedAt: number; // 지도 idle 시각 (재검색 버튼 표시용)
  selectedId: string | null;
  courseIds: string[];
  onResults: (places: Place[]) => void;
  onSelect: (p: Place) => void;
  onAdd: (p: Place) => void;
  onCandidate?: (p: Place) => void;
  onAround?: (p: Place) => void;
  onLocate?: (pos: { lat: number; lng: number }) => void; // 내 위치를 지도에 표시
}

type IO = "all" | "indoor" | "outdoor";

export default function PlaceSearch({ map, mapMovedAt, selectedId, courseIds, onResults, onSelect, onAdd, onCandidate, onAround, onLocate }: Props) {
  const [keyword, setKeyword] = useState("");
  const [catKey, setCatKey] = useState<string | null>("cafe");
  const [io, setIo] = useState<IO>("all");
  const [results, setResults] = useState<Place[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAt, setSearchedAt] = useState(0);
  const spotsCache = useRef<Place[] | null>(null);
  const [locating, setLocating] = useState(false);

  /** 지도를 내 위치로 옮기고, 선택된 카테고리(없으면 카페)로 주변 검색 */
  async function nearMe() {
    if (!map) return;
    setLocating(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const { kakao } = window;
      map.setLevel(4);
      map.setCenter(new kakao.maps.LatLng(pos.lat, pos.lng));
      onLocate?.(pos);
      const cat = catKey && catKey !== "spot" ? catKey : "cafe";
      setCatKey(cat);
      setKeyword("");
      setTimeout(() => run({ cat, kw: "" }), 150); // 지도 영역이 갱신된 뒤 검색
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function run(opts: { page?: number; kw?: string; cat?: string | null } = {}) {
    if (!map) return;
    const kw = opts.kw ?? keyword;
    const cat = opts.cat !== undefined ? opts.cat : catKey;
    const p = opts.page ?? 1;
    setLoading(true);
    setError(null);
    try {
      let places: Place[] = [];
      let next = false;
      let stamp = Date.now();
      const bounds = map.getBounds();
      if (cat === "spot") {
        // 승인된 제보 명소 중 현재 지도 영역 안에 있는 것
        if (!spotsCache.current) spotsCache.current = (await listSpots("approved")).map(spotToPlace);
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        places = spotsCache.current.filter(
          (s) => s.lat >= sw.getLat() && s.lat <= ne.getLat() && s.lng >= sw.getLng() && s.lng <= ne.getLng(),
        );
      } else if (kw.trim()) {
        // 키워드 검색은 전국 대상으로 찾고, 결과가 보이도록 지도를 옮긴다
        const r = await keywordSearch(kw.trim(), { page: p });
        places = r.places;
        next = r.hasNext;
        if (p === 1 && places.length) {
          const { kakao } = window;
          const b = new kakao.maps.LatLngBounds();
          places.forEach((pl) => b.extend(new kakao.maps.LatLng(pl.lat, pl.lng)));
          map.setBounds(b, 40, 40, 40, 40);
          stamp = Date.now() + 1500; // 지도 이동으로 재검색 버튼이 바로 뜨지 않게
        }
      } else if (cat) {
        const r = await searchByCategory(CATEGORIES.find((c) => c.key === cat)!, { bounds, page: p });
        places = r.places;
        next = r.hasNext;
      }
      const merged = p === 1 ? places : [...results, ...places];
      setResults(merged);
      setHasNext(next);
      setPage(p);
      setSearchedAt(stamp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // 지도 준비되면 기본 카테고리 검색
  useEffect(() => {
    if (map) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const filtered = results.filter((p) => {
    if (io === "all") return true;
    const indoor = categoryOf(p.groupCode, p.category).indoor;
    return io === "indoor" ? indoor : !indoor;
  });

  // 부모(지도)로 결과 전달
  useEffect(() => {
    onResults(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, io]);

  const moved = mapMovedAt > searchedAt + 300;

  return (
    <div className="flex flex-col md:h-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCatKey(null);
          run({ kw: keyword, cat: null });
        }}
        className="flex gap-2"
      >
        <input className="input" placeholder="장소·지역 검색 (예: 성수 파스타)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button className="btn-primary shrink-0">검색</button>
        <button type="button" onClick={nearMe} disabled={locating} className="btn-ghost shrink-0 px-2.5" title="내 주변 검색">
          {locating ? "…" : "📍"}
        </button>
      </form>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {[...CATEGORIES, SPOT_CATEGORY].map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setCatKey(c.key);
              setKeyword("");
              run({ cat: c.key, kw: "" });
            }}
            className={`chip ${catKey === c.key ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200 bg-white"}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {(["all", "indoor", "outdoor"] as IO[]).map((v) => (
          <button key={v} onClick={() => setIo(v)} className={`rounded px-2 py-1 ${io === v ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-100"}`}>
            {v === "all" ? "전체" : v === "indoor" ? "실내" : "실외"}
          </button>
        ))}
        {moved && (
          <button onClick={() => run()} className="ml-auto rounded-full bg-stone-800 px-3 py-1 text-white">
            ↻ 현재 지도에서 재검색
          </button>
        )}
      </div>

      {/* 모바일에서는 목록이 페이지와 함께 스크롤되고, PC에서는 패널 안에서만 스크롤 */}
      <div className="mt-2 space-y-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!loading && !filtered.length && <p className="py-6 text-center text-sm text-stone-400">검색 결과가 없어요</p>}
        {filtered.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            selected={selectedId === p.id}
            inCourse={courseIds.includes(p.id)}
            onSelect={() => onSelect(p)}
            onAdd={() => onAdd(p)}
            onCandidate={onCandidate ? () => onCandidate(p) : undefined}
            onAround={onAround ? () => onAround(p) : undefined}
          />
        ))}
        {hasNext && (
          <button onClick={() => run({ page: page + 1 })} className="btn-ghost w-full" disabled={loading}>
            {loading ? "불러오는 중…" : "더 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
