import Link from "next/link";
import { categoryOf } from "@/lib/categories";
import { formatDuration, formatWon } from "@/lib/geo";
import { totalMinutes } from "@/lib/timeline";
import type { Course } from "@/lib/types";

export default function CourseCard({ course, href }: { course: Course; href?: string }) {
  const mins = totalMinutes(course.stops);
  return (
    <Link href={href ?? `/c/${course.id}`} className="card block p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{course.title}</p>
        {course.region && <span className="chip shrink-0 border-stone-200 text-stone-500">{course.region}</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">
        {course.stops.map((s) => `${categoryOf(s.place.groupCode, s.place.category).emoji} ${s.place.name}`).join("  →  ") || "아직 장소가 없어요"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span>⏱ {formatDuration(mins)}</span>
        <span>💰 {formatWon(course.totalCost)}</span>
        <span>❤️ {course.likeCount}</span>
        <span>🔖 {course.scrapCount}</span>
        {course.tags.slice(0, 3).map((t) => <span key={t} className="text-rose-500">#{t}</span>)}
      </div>
    </Link>
  );
}
