import type { Place } from "./types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

export function courseUrl(id: string) {
  return `${SITE_URL}/c/${id}`;
}

/** 카카오맵 길찾기 (모바일에서는 앱으로 열림) */
export function kakaoRouteLink(p: Place) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
}

/** 네이버 지도 앱 대중교통 길찾기 (앱 미설치 시 동작하지 않으므로 웹 검색 링크도 함께 제공) */
export function naverRouteLink(p: Place) {
  return `nmap://route/public?dlat=${p.lat}&dlng=${p.lng}&dname=${encodeURIComponent(p.name)}&appname=${encodeURIComponent(SITE_URL || "date-course")}`;
}

export function naverSearchLink(p: Place) {
  return `https://map.naver.com/p/search/${encodeURIComponent(p.name)}`;
}

/** 예약 바로가기 — 각 서비스의 검색 결과 페이지로 연결 (URL 형식은 서비스 정책에 따라 바뀔 수 있음) */
export function reservationLinks(p: Place): { label: string; href: string }[] {
  const q = encodeURIComponent(p.name);
  const links = [{ label: "네이버 예약", href: `https://map.naver.com/p/search/${q}` }];
  if (p.groupCode === "FD6" || /음식점|술집|바/.test(p.category)) {
    links.unshift({ label: "캐치테이블", href: `https://app.catchtable.co.kr/ct/search/total?keyword=${q}` });
  }
  return links;
}
