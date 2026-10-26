"use client";
import DateField from "@/components/DateField";
import { MOODS, REGIONS, TAGS } from "@/lib/categories";
import type { Course, Mood, Visibility } from "@/lib/types";

interface Props {
  course: Course;
  onChange: (patch: Partial<Course>) => void;
}

export default function CourseMetaForm({ course, onChange }: Props) {
  const toggleTag = (t: string) =>
    onChange({ tags: course.tags.includes(t) ? course.tags.filter((x) => x !== t) : [...course.tags, t] });

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="text-stone-500">코스 이름</span>
        <input key={course.title} className="input mt-1" defaultValue={course.title} onBlur={(e) => e.target.value !== course.title && onChange({ title: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">한줄 소개</span>
        <textarea key={course.description} className="input mt-1" rows={2} defaultValue={course.description}
          onBlur={(e) => e.target.value !== course.description && onChange({ description: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          <span className="text-stone-500">날짜</span>
          <DateField className="mt-1" value={course.date ?? ""} placeholder="날짜 선택" clearable
            onChange={(v) => onChange({ date: v || null, status: v && course.status === "draft" ? "planned" : course.status })} />
        </label>
        <label className="text-sm">
          <span className="text-stone-500">시작 시각</span>
          <DateField type="time" className="mt-1" value={course.startTime} onChange={(v) => v && onChange({ startTime: v })} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-stone-500">지역</span>
        <input key={course.region} className="input mt-1" list="regions" defaultValue={course.region} onBlur={(e) => e.target.value !== course.region && onChange({ region: e.target.value })} />
        <datalist id="regions">{REGIONS.map((r) => <option key={r} value={r} />)}</datalist>
      </label>
      <div className="text-sm">
        <span className="text-stone-500">분위기</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button key={m.key} onClick={() => onChange({ mood: course.mood === m.key ? null : (m.key as Mood) })}
              className={`chip ${course.mood === m.key ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200"}`}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-sm">
        <span className="text-stone-500">태그</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button key={t} onClick={() => toggleTag(t)}
              className={`chip ${course.tags.includes(t) ? "border-rose-400 bg-rose-50 text-rose-600" : "border-stone-200"}`}>
              #{t}
            </button>
          ))}
        </div>
      </div>
      <div className="text-sm">
        <span className="text-stone-500">공개 범위</span>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {([
            ["private", "🔒 나만", "나와 공동 편집자만"],
            ["link", "🔗 링크", "링크가 있는 사람"],
            ["public", "🌏 전체 공개", "둘러보기에 노출"],
          ] as [Visibility, string, string][]).map(([v, label, desc]) => (
            <button key={v} onClick={() => onChange({ visibility: v })}
              className={`rounded-lg border p-2 text-left ${course.visibility === v ? "border-rose-400 bg-rose-50" : "border-stone-200"}`}>
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-[11px] text-stone-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
