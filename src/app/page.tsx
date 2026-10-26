"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CourseCard from "@/components/course/CourseCard";
import DateField from "@/components/DateField";
import { useAuth } from "@/hooks/useAuth";
import { MOODS, REGIONS } from "@/lib/categories";
import { COLLECTIONS } from "@/lib/collections";
import { listPublicCourses } from "@/lib/courses";
import { getProfile } from "@/lib/spots";
import { upcomingMilestones, type Milestone } from "@/lib/anniversary";
import type { Course } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [region, setRegion] = useState("");
  const [mood, setMood] = useState("casual");
  const [date, setDate] = useState("");
  const [popular, setPopular] = useState<Course[]>([]);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    listPublicCourses({ sort: "popular", max: 6 }).then(setPopular).catch(() => {});
  }, []);
  // 기념일 7일 이내면 배너
  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => {
      const m = p?.anniversary ? upcomingMilestones(p.anniversary, 1)[0] : null;
      setMilestone(m && m.dday <= 7 ? m : null);
    }).catch(() => {});
  }, [user]);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams({ region: region || "성수", mood, ...(date ? { date } : {}) });
    router.push(`/recommend?${qs}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-4 pb-16">
      {milestone && (
        <Link href="/recommend?mood=anniversary" className="block rounded-xl bg-rose-500 p-4 text-white">
          💝 {milestone.label} 기념일이 {milestone.dday === 0 ? "오늘이에요" : `${milestone.dday}일 남았어요`}! 기념일 코스 추천받기 →
        </Link>
      )}

      <section className="rounded-2xl bg-gradient-to-br from-rose-100 via-orange-50 to-amber-50 px-6 py-12 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">오늘 어디 갈까?</h1>
        <p className="mt-2 text-stone-600">장소를 고르고 이으면 동선·시간·비용이 한 번에</p>
        <form onSubmit={go} className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 rounded-xl bg-white p-2 shadow-sm md:flex-row">
          <input className="input border-0" list="home-regions" placeholder="어디서? (예: 성수)" value={region} onChange={(e) => setRegion(e.target.value)} />
          <datalist id="home-regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
          <DateField className="border-0 md:w-48" value={date} onChange={setDate} placeholder="언제? (선택)" clearable />
          <select className="input border-0 md:w-36" value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOODS.map((m) => <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>)}
          </select>
          <button className="btn-primary shrink-0 px-5">코스 추천</button>
        </form>
        <Link href="/recommend?near=1" className="mt-3 inline-flex items-center gap-1 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
          📍 지금 내 주변 코스 추천
        </Link>
        <p className="mt-3 text-sm text-stone-500">
          직접 짜고 싶다면 <Link href="/course/new" className="font-semibold text-rose-500 underline">빈 코스에서 시작</Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">테마 컬렉션</h2>
          <Link href="/collections" className="text-sm text-stone-500">전체 →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLLECTIONS.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="card w-48 shrink-0 p-4 hover:shadow-md">
              <p className="text-2xl">{c.emoji}</p>
              <p className="mt-1 font-semibold">{c.title}</p>
              <p className="text-xs text-stone-500">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">인기 코스</h2>
          <Link href="/explore" className="text-sm text-stone-500">더 보기 →</Link>
        </div>
        {popular.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <p className="text-sm text-stone-400">첫 공개 코스의 주인공이 되어 보세요</p>
        )}
      </section>
    </div>
  );
}
