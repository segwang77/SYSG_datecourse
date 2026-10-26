"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CourseCard from "@/components/course/CourseCard";
import { findCollection } from "@/lib/collections";
import { listPublicCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const col = findCollection(slug);
  const [list, setList] = useState<Course[] | null>(null);

  useEffect(() => {
    if (!col) return;
    listPublicCourses({ tag: col.tag, max: col.filter ? 200 : 60 })
      .then((cs) => setList(col.filter ? cs.filter(col.filter) : cs))
      .catch(() => setList([]));
  }, [col]);

  if (!col) return <div className="p-10 text-center text-stone-500">없는 컬렉션이에요</div>;
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div>
        <p className="text-4xl">{col.emoji}</p>
        <h1 className="mt-2 text-2xl font-bold">{col.title}</h1>
        <p className="text-stone-500">{col.description}</p>
      </div>
      {!list && <p className="text-stone-400">불러오는 중…</p>}
      {list?.length === 0 && <p className="py-10 text-center text-stone-400">아직 이 테마의 공개 코스가 없어요</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list?.map((c) => <CourseCard key={c.id} course={c} />)}
      </div>
    </div>
  );
}
