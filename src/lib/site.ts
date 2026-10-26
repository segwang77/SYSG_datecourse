/**
 * 사이트 기본 설정 — 여기만 고치면 모든 페이지에 적용돼요.
 * (src/app/layout.tsx 가 이 값을 읽어서 브라우저 탭 이름과 파비콘을 설정해요)
 */
export const SITE = {
  /** 브라우저 탭에 보이는 이름 */
  title: "SY❤️SG",

  /** 검색 결과·링크 미리보기에 보이는 설명 */
  description: "장소를 고르고 순서대로 이으면 동선·시간·비용이 한 번에",

  /**
   * 파비콘 (탭 왼쪽의 작은 아이콘). 둘 중 한 가지 방식으로 적어요.
   *  1) 이미지 파일: public 폴더에 파일을 넣고 "/파일이름" 으로 적기  예) "/favicon.png"
   *  2) 이모지 한 글자: 이미지 없이 이모지를 아이콘으로 쓰기          예) "💕"
   */
  favicon: "/favicon.png",

  /** 카카오톡·SNS에 링크를 공유할 때 보이는 대표 이미지 (public 폴더 기준) */
  shareImage: "/og-cat.png",
};

/** favicon 값이 파일 경로면 그대로, 이모지면 SVG 아이콘으로 바꿔서 돌려준다 */
export function faviconHref(): string {
  const v = SITE.favicon.trim();
  if (v.startsWith("/") || v.startsWith("http")) return v;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${v}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
