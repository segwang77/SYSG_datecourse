"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LoginRequired from "@/components/LoginRequired";
import CourseCard from "@/components/course/CourseCard";
import { useAuth } from "@/hooks/useAuth";
import { listMyCourses } from "@/lib/courses";
import { listScraps, type ScrapItem } from "@/lib/community";
import type { Course } from "@/lib/types";

const STATUS_LABEL = { draft: "초안", planned: "예정", done: "다녀옴" };

function MyPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"mine" | "scraps">("mine");
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [scraps, setScraps] = useState<ScrapItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyCourses(user.uid).then(setCourses).catch(() => setCourses([]));
    listScraps(user.uid).then(setScraps).catch(() => setScraps([]));
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">내 코스</h1>
        <Link href="/me/records" className="text-sm text-rose-500">📔 기록장 →</Link>
      </div>
      <div className="flex gap-3 border-b border-stone-200 text-sm">
        <button onClick={() => setTab("mine")} className={`pb-2 ${tab === "mine" ? "border-b-2 border-rose-500 font-semibold" : "text-stone-500"}`}>
          만든 코스 {courses?.length ?? ""}
        </button>
        <button onClick={() => setTab("scraps")} className={`pb-2 ${tab === "scraps" ? "border-b-2 border-rose-500 font-semibold" : "text-stone-500"}`}>
          스크랩 {scraps?.length ?? ""}
        </button>
      </div>

      {tab === "mine" && (
        <>
          {courses?.length === 0 && (
            <div className="py-10 text-center text-stone-400">
              아직 코스가 없어요. <Link href="/course/new" className="text-rose-500 underline">첫 코스 만들기</Link>
            </div>
          )}
          {(["draft", "planned", "done"] as const).map((st) => {
            const list = courses?.filter((c) => c.status === st) ?? [];
            if (!list.length) return null;
            return (
              <section key={st} className="space-y-2">
                <h2 className="text-sm font-semibold text-stone-500">{STATUS_LABEL[st]} {list.length}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <div key={c.id} className="relative">
                      <CourseCard course={c} href={`/course/${c.id}/edit`} />
                      {c.ownerId !== user?.uid && <span className="absolute right-3 bottom-3 text-xs text-stone-400">👥 공동편집</span>}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {tab === "scraps" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scraps?.length === 0 && <p className="text-stone-400">스크랩한 코스가 없어요</p>}
          {scraps?.map((s) => (
            <Link key={s.courseId} href={`/c/${s.courseId}`} className="card block p-4 hover:shadow-md">
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-stone-500">{s.stopNames.join(" → ")}</p>
              {s.region && <p className="mt-2 text-xs text-stone-400">📍 {s.region}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <LoginRequired>
      <MyPage />
    </LoginRequired>
  );
}
