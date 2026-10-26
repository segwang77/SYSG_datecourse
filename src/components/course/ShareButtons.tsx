"use client";
import { useState } from "react";
import { copyLink, shareToKakao } from "@/lib/share";
import { courseUrl, SITE_URL } from "@/lib/links";
import type { Course } from "@/lib/types";

export default function ShareButtons({ course, showInvite, onMakeLinkVisible }: { course: Course; showInvite?: boolean; onMakeLinkVisible?: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };
  const needsVisibility = course.visibility === "private";

  return (
    <div className="space-y-2">
      {needsVisibility && onMakeLinkVisible && (
        <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          지금은 나만 볼 수 있어요.{" "}
          <button onClick={onMakeLinkVisible} className="font-semibold underline">링크 공개로 바꾸기</button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button className="btn bg-[#FEE500] text-black" disabled={needsVisibility} onClick={() => shareToKakao(course).catch(() => flash("카카오톡 공유 실패"))}>
          카카오톡 공유
        </button>
        <button className="btn-ghost" disabled={needsVisibility} onClick={async () => flash((await copyLink(courseUrl(course.id))) ? "링크를 복사했어요" : "복사 실패")}>
          링크 복사
        </button>
        {showInvite && (
          <button className="btn-ghost" onClick={async () => flash((await copyLink(`${SITE_URL}/join/${course.id}?code=${course.inviteCode}`)) ? "초대 링크를 복사했어요" : "복사 실패")}>
            👥 함께 편집 초대
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}
