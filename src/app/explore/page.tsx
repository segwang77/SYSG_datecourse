"use client";
import { useEffect, useState } from "react";
import CourseCard from "@/components/course/CourseCard";
import { REGIONS, TAGS } from "@/lib/categories";
import { listPublicCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";

export default function ExplorePage() {
  const [region, setRegion] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [list, setList] = useState<Course[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setList(null);
    setErr(null);
    listPublicCourses({ region: region || undefined, tag: tag || undefined, sort })
      .then(setList)
      .catch((e) => {
        setErr(e.message);
        setList([]);
      });
  }, [region, tag, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">다른 커플의 코스 둘러보기</h1>
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["", ...REGIONS].map((r) => (
            <button key={r} onClick={() => setRegion(r)} className={`chip ${region === r ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200 bg-white"}`}>
              {r || "전체 지역"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["", ...TAGS].map((t) => (
            <button key={t} onClick={() => setTag(t)} className={`chip ${tag === t ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200 bg-white"}`}>
              {t ? `#${t}` : "전체 테마"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setSort("popular")} className={sort === "popular" ? "font-semibold text-rose-600" : "text-stone-500"}>인기순</button>
          <button onClick={() => setSort("recent")} className={sort === "recent" ? "font-semibold text-rose-600" : "text-stone-500"}>최신순</button>
        </div>
      </div>
      {err && <p className="text-sm text-red-500">{err} (Firestore 색인이 필요하면 콘솔 링크를 확인하세요)</p>}
      {!list && <p className="text-stone-400">불러오는 중…</p>}
      {list?.length === 0 && !err && <p className="py-10 text-center text-stone-400">아직 공개된 코스가 없어요</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((c) => <CourseCard key={c.id} course={c} />)}
      </div>
    </div>
  );
}
