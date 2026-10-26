"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoginRequired from "@/components/LoginRequired";
import KakaoMap, { type MapCircle } from "@/components/map/KakaoMap";
import DateField from "@/components/DateField";
import { useAuth } from "@/hooks/useAuth";
import { listDoneCourses } from "@/lib/courses";
import { getProfile, setAnniversary } from "@/lib/spots";
import { daysTogether, upcomingMilestones } from "@/lib/anniversary";
import { formatWon } from "@/lib/geo";
import type { Course } from "@/lib/types";

/** 데이트 기록장: 날짜별 아카이브 + 방문 지도 + 기념일 */
function Records() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [anniv, setAnniv] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(""); // 사귄 날 입력 중인 값

  useEffect(() => {
    if (!user) return;
    listDoneCourses(user.uid).then(setCourses).catch(() => setCourses([]));
    getProfile(user.uid).then((p) => setAnniv(p?.anniversary ?? null));
  }, [user]);

  // 같은 장소 방문 횟수 집계 → 원 크기/진하기
  const circles = useMemo<MapCircle[]>(() => {
    const m = new Map<string, MapCircle>();
    courses?.forEach((c) =>
      c.stops.forEach((s) => {
        const k = s.place.id;
        const prev = m.get(k);
        m.set(k, { lat: s.place.lat, lng: s.place.lng, label: s.place.name, count: (prev?.count ?? 0) + 1 });
      }),
    );
    return Array.from(m.values());
  }, [courses]);

  const byMonth = useMemo(() => {
    const g = new Map<string, Course[]>();
    courses?.forEach((c) => {
      const k = (c.date ?? "날짜 없음").slice(0, 7);
      g.set(k, [...(g.get(k) ?? []), c]);
    });
    return Array.from(g.entries());
  }, [courses]);

  const top = [...circles].sort((a, b) => b.count - a.count).slice(0, 5);
  const totalSpent = courses?.reduce((s, c) => s + c.totalCost, 0) ?? 0;
  const center = circles[0] ? { lat: circles[0].lat, lng: circles[0].lng } : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">📔 우리의 기록장</h1>

      {/* 기념일 */}
      <section className="card flex flex-wrap items-center gap-4 p-4">
        {anniv && !editing ? (
          <>
            <div>
              <p className="text-sm text-stone-500">함께한 지</p>
              <p className="text-3xl font-bold text-rose-500">{daysTogether(anniv)}일</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingMilestones(anniv).map((m) => (
                <div key={m.label} className={`rounded-lg px-3 py-2 text-sm ${m.dday <= 7 ? "bg-rose-500 text-white" : "bg-stone-100"}`}>
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-xs">{m.date} · {m.dday === 0 ? "오늘!" : `D-${m.dday}`}</p>
                </div>
              ))}
            </div>
            <button onClick={() => { setDraft(anniv ?? ""); setEditing(true); }} className="ml-auto text-xs text-stone-400 underline">수정</button>
          </>
        ) : (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = draft || null;
              if (user) await setAnniversary(user.uid, v);
              setAnniv(v);
              setEditing(false);
            }}
          >
            <span className="text-sm">💕 사귄 날을 입력하면 기념일을 알려드려요</span>
            <DateField className="w-52" value={draft} onChange={setDraft} placeholder="사귄 날 선택" clearable />
            <button className="btn-primary">저장</button>
          </form>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          <KakaoMap className="h-[420px] overflow-hidden rounded-xl" circles={circles} center={center} level={7} />
          <p className="text-xs text-stone-400">원이 크고 진할수록 자주 간 곳이에요</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card p-3"><p className="text-xl font-bold">{courses?.length ?? 0}</p><p className="text-xs text-stone-500">데이트</p></div>
            <div className="card p-3"><p className="text-xl font-bold">{circles.length}</p><p className="text-xs text-stone-500">장소</p></div>
            <div className="card p-3"><p className="text-sm font-bold">{formatWon(totalSpent)}</p><p className="text-xs text-stone-500">예상 지출</p></div>
          </div>
          {top.length > 0 && (
            <div className="card p-3">
              <p className="mb-2 text-sm font-semibold">자주 간 곳</p>
              <ol className="space-y-1 text-sm">
                {top.map((c, i) => <li key={c.label + i}>{i + 1}. {c.label} <span className="text-stone-400">{c.count}회</span></li>)}
              </ol>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-4">
        {courses?.length === 0 && (
          <p className="py-6 text-center text-stone-400">코스 편집기에서 &lsquo;다녀왔어요&rsquo;를 누르면 여기에 쌓여요</p>
        )}
        {byMonth.map(([month, list]) => (
          <div key={month}>
            <h2 className="mb-2 text-sm font-semibold text-stone-500">{month}</h2>
            <ul className="space-y-2">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.id}`} className="card flex items-center gap-3 p-3 hover:shadow">
                    <span className="w-24 shrink-0 text-sm text-stone-500">{c.date}</span>
                    <span className="flex-1 truncate">
                      <b>{c.title}</b> <span className="text-sm text-stone-500">{c.stops.map((s) => s.place.name).join(" → ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <LoginRequired>
      <Records />
    </LoginRequired>
  );
}
