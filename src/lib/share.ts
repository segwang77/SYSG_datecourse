"use client";
import { loadKakaoSdk } from "./kakao";
import { courseUrl, SITE_URL } from "./links";
import { SITE } from "./site";
import type { Course } from "./types";

export async function shareToKakao(course: Course) {
  const Kakao = await loadKakaoSdk();
  const url = courseUrl(course.id);
  const names = course.stops.map((s) => s.place.name).join(" → ");
  Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: course.title || "데이트 코스",
      description: names || "코스를 확인해 보세요",
      imageUrl: `${SITE_URL}${SITE.shareImage}`, // 대표 이미지는 src/lib/site.ts 에서 설정
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: "코스 보기", link: { mobileWebUrl: url, webUrl: url } }],
  });
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ url });
      return true;
    }
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
