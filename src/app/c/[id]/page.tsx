"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import KakaoMap from "@/components/map/KakaoMap";
import Timeline from "@/components/course/Timeline";
import ShareButtons from "@/components/course/ShareButtons";
import ReviewSection from "@/components/course/ReviewSection";
import WeatherBadge, { useWeather } from "@/components/WeatherBadge";
import { useAuth } from "@/hooks/useAuth";
import { forkCourse, subscribeCourse } from "@/lib/courses";
import { isLiked, isScrapped, toggleLike, toggleScrap } from "@/lib/community";
import { computeTimeline, totalMinutes } from "@/lib/timeline";
import { formatDuration, formatWon } from "@/lib/geo";
import { MOODS } from "@/lib/categories";
import type { Course } from "@/lib/types";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loginKakao } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [denied, setDenied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [scrapped, setScrapped] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => subscribeCourse(id, setCourse, () => setDenied(true)), [id, user]);
  useEffect(() => {
    if (!user) return;
    isLiked(id, user.uid).then(setLiked).catch(() => {});
    isScrapped(id, user.uid).then(setScrapped).catch(() => {});
  }, [id, user]);

  const timeline = useMemo(() => (course ? computeTimeline(course.startTime, course.stops) : []), [course]);
  const first = course?.stops[0]?.place;
  const weather = useWeather(first?.lat, first?.lng, course?.date, course?.startTime);

  if (denied) return <div className="p-10 text-center text-stone-500">비공개 코스예요 🔒</div>;
  if (course === undefined) return <div className="p-10 text-center text-stone-400">불러오는 중…</div>;
  if (!course) return <div className="p-10 text-center text-stone-500">코스를 찾을 수 없어요</div>;

  const isMember = !!user && course.members.includes(user.uid);
  const needLogin = async () => {
    if (!user) await loginKakao();
  };
  const mood = MOODS.find((m) => m.key === course.mood);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4 lg:sticky lg:top-18 lg:h-[calc(100dvh-90px)]">
        <KakaoMap className="h-[45vh] overflow-hidden rounded-xl lg:h-full" stops={course.stops} activeStopUid={active} onStopClick={setActive} fitKey={course.id} />
      </div>

      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {course.region && <span className="chip border-stone-200">📍 {course.region}</span>}
            {mood && <span className="chip border-stone-200">{mood.emoji} {mood.label}</span>}
            {course.tags.map((t) => <span key={t} className="chip border-rose-200 text-rose-500">#{t}</span>)}
          </div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && <p className="text-stone-600">{course.description}</p>}
          <p className="text-sm text-stone-500">by {course.ownerName}{course.date && ` · ${course.date}`}</p>
          <div className="flex flex-wrap gap-1.5 text-sm">
            <span className="chip border-stone-200">⏱ {formatDuration(totalMinutes(course.stops))}</span>
            <span className="chip border-stone-200">💰 {formatWon(course.totalCost)}</span>
            <WeatherBadge w={weather} />
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          {isMember && <Link href={`/course/${course.id}/edit`} className="btn-primary">✏️ 편집</Link>}
          {isMember && <Link href={`/c/${course.id}/live`} className="btn-ghost">▶ 당일 모드</Link>}
          <button className="btn-ghost" onClick={async () => { if (!user) return needLogin(); setLiked(await toggleLike(course.id, user.uid)); }}>
            {liked ? "❤️" : "🤍"} {course.likeCount}
          </button>
          <button className="btn-ghost" onClick={async () => { if (!user) return needLogin(); setScrapped(await toggleScrap(course, user.uid)); }}>
            {scrapped ? "🔖 스크랩됨" : "🔖 스크랩"}
          </button>
          <button className="btn-ghost" onClick={async () => { if (!user) return needLogin(); router.push(`/course/${await forkCourse(course, user)}/edit`); }}>
            📥 내 코스로 가져오기
          </button>
        </div>

        {course.visibility !== "private" && <ShareButtons course={course} />}

        <Timeline stops={course.stops} timeline={timeline} onFocus={setActive} />

        {course.visibility !== "private" && <ReviewSection courseId={course.id} plannedCost={course.totalCost} />}
      </div>
    </div>
  );
}
