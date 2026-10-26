"use client";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { removeCandidate, subscribeCandidates, toggleVote } from "@/lib/courses";
import { categoryOf } from "@/lib/categories";
import type { Candidate, Place } from "@/lib/types";

interface Props {
  courseId: string;
  user: User;
  memberCount: number;
  onConfirm: (p: Place) => void;
  onFocus: (p: Place) => void;
}

/** 후보 장소 투표 — "여기 vs 여기" */
export default function CandidatePanel({ courseId, user, memberCount, onConfirm, onFocus }: Props) {
  const [list, setList] = useState<Candidate[]>([]);
  useEffect(() => subscribeCandidates(courseId, setList), [courseId]);

  if (!list.length)
    return (
      <p className="py-10 text-center text-sm text-stone-400">
        검색 결과에서 &lsquo;후보로 투표 올리기&rsquo;를 누르면<br />함께 편집하는 사람과 투표할 수 있어요
      </p>
    );

  const sorted = [...list].sort((a, b) => b.votes.length - a.votes.length);
  return (
    <ul className="space-y-2">
      {sorted.map((c) => {
        const voted = c.votes.includes(user.uid);
        const cat = categoryOf(c.place.groupCode, c.place.category);
        const pct = Math.round((c.votes.length / Math.max(memberCount, 1)) * 100);
        return (
          <li key={c.id} className="card p-3">
            <div className="flex items-center gap-2">
              <button onClick={() => onFocus(c.place)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold">{cat.emoji} {c.place.name}</p>
                <p className="text-xs text-stone-500">{c.addedByName}님이 올림</p>
              </button>
              <button onClick={() => toggleVote(courseId, c, user.uid)}
                className={`chip ${voted ? "border-rose-400 bg-rose-500 text-white" : "border-stone-200"}`}>
                👍 {c.votes.length}
              </button>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-stone-100">
              <div className="h-full bg-rose-400" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={async () => { onConfirm(c.place); await removeCandidate(courseId, c.id); }} className="btn-primary px-2 py-1 text-xs">
                코스에 확정
              </button>
              <button onClick={() => removeCandidate(courseId, c.id)} className="btn-ghost px-2 py-1 text-xs">삭제</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
