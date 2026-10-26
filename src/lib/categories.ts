/**
 * 앱 카테고리 정의.
 * 카카오 로컬 API는 음식점(FD6)·카페(CE7)·문화시설(CT1)·관광명소(AT4)는 카테고리 코드로,
 * 술집·액티비티·산책은 코드가 없어서 키워드 검색으로 찾는다.
 */
export interface AppCategory {
  key: string;
  label: string;
  emoji: string;
  kakaoCode?: string; // 카카오 category_group_code
  keyword?: string; // 코드가 없을 때 사용할 검색 키워드
  indoor: boolean;
  defaultStay: number; // 기본 체류시간(분)
  defaultCost: number; // 두 사람 기준 기본 예상 비용(원)
  color: string;
}

export const CATEGORIES: AppCategory[] = [
  { key: "food", label: "맛집", emoji: "🍽️", kakaoCode: "FD6", indoor: true, defaultStay: 80, defaultCost: 50000, color: "#ef4444" },
  { key: "cafe", label: "카페", emoji: "☕", kakaoCode: "CE7", indoor: true, defaultStay: 60, defaultCost: 15000, color: "#a16207" },
  { key: "culture", label: "전시·문화", emoji: "🖼️", kakaoCode: "CT1", indoor: true, defaultStay: 90, defaultCost: 30000, color: "#7c3aed" },
  { key: "walk", label: "산책", emoji: "🌳", keyword: "공원", indoor: false, defaultStay: 50, defaultCost: 0, color: "#16a34a" },
  { key: "activity", label: "액티비티", emoji: "🎳", keyword: "방탈출", indoor: true, defaultStay: 90, defaultCost: 44000, color: "#0ea5e9" },
  { key: "bar", label: "술집", emoji: "🍷", keyword: "와인바", indoor: true, defaultStay: 90, defaultCost: 60000, color: "#db2777" },
  { key: "sight", label: "명소", emoji: "📸", kakaoCode: "AT4", indoor: false, defaultStay: 40, defaultCost: 0, color: "#f59e0b" },
];

export const SPOT_CATEGORY: AppCategory = {
  key: "spot", label: "숨은 명소", emoji: "💎", keyword: "", indoor: false, defaultStay: 40, defaultCost: 0, color: "#9333ea",
};

/** 액티비티 추천에 돌려 쓸 키워드 후보 */
export const ACTIVITY_KEYWORDS = ["방탈출", "보드게임카페", "볼링장", "공방", "VR체험"];

const KEYWORD_HINTS: [RegExp, string][] = [
  [/술집|주점|바$|와인|칵테일|포차|호프|이자카야/, "bar"],
  [/공원|산책|둘레길|한강/, "walk"],
  [/방탈출|보드게임|볼링|공방|오락|체험|VR|클라이밍/, "activity"],
];

/** 카카오 검색 결과(그룹코드 + 카테고리명)로 앱 카테고리를 판별 */
export function categoryOf(groupCode: string, categoryName = ""): AppCategory {
  if (groupCode === "spot") return SPOT_CATEGORY;
  for (const [re, key] of KEYWORD_HINTS) {
    if (re.test(categoryName)) return CATEGORIES.find((c) => c.key === key)!;
  }
  const byCode = CATEGORIES.find((c) => c.kakaoCode === groupCode);
  if (byCode) return byCode;
  return { key: "etc", label: "기타", emoji: "📍", indoor: true, defaultStay: 60, defaultCost: 20000, color: "#64748b" };
}

export const MOODS = [
  { key: "calm", label: "조용하게", emoji: "🌙" },
  { key: "active", label: "활동적으로", emoji: "⚡" },
  { key: "anniversary", label: "기념일", emoji: "💝" },
  { key: "casual", label: "가볍게", emoji: "🙂" },
] as const;

export const TAGS = ["첫데이트", "기념일", "비오는날", "가성비", "야경", "실내", "산책", "맛집투어", "액티비티"];

export const REGIONS = ["성수", "연남·홍대", "을지로", "한남·이태원", "잠실", "강남", "익선·종로", "망원", "여의도", "부산 해운대"];
