"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Place } from "./types";

declare global {
  interface Window {
    kakao: any;
    Kakao: any;
  }
}

export const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

let mapPromise: Promise<any> | null = null;
let sdkPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(s);
  });
}

/** 카카오 지도 SDK (services: 장소 검색, clusterer: 마커 클러스터) */
export function loadKakaoMap(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (!mapPromise) {
    mapPromise = loadScript(
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&libraries=services,clusterer&autoload=false`,
    ).then(() => new Promise((resolve) => window.kakao.maps.load(() => resolve(window.kakao))));
  }
  return mapPromise;
}

/** 카카오 JavaScript SDK (카카오톡 공유) */
export function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.Kakao?.isInitialized?.()) return Promise.resolve(window.Kakao);
  if (!sdkPromise) {
    sdkPromise = loadScript("https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js").then(() => {
      if (!window.Kakao.isInitialized()) window.Kakao.init(JS_KEY);
      return window.Kakao;
    });
  }
  return sdkPromise;
}

export function toPlace(d: any): Place {
  return {
    id: String(d.id),
    name: d.place_name,
    category: d.category_name ?? "",
    groupCode: d.category_group_code ?? "",
    address: d.road_address_name || d.address_name || "",
    phone: d.phone || undefined,
    lat: Number(d.y),
    lng: Number(d.x),
    url: d.place_url || undefined,
    distance: d.distance ? Number(d.distance) : undefined,
  };
}

export interface SearchOptions {
  lat?: number;
  lng?: number;
  radius?: number; // m (최대 20000)
  bounds?: any; // kakao.maps.LatLngBounds
  page?: number;
  sortByDistance?: boolean;
}

export interface SearchResult {
  places: Place[];
  hasNext: boolean;
}

function buildOptions(kakao: any, o: SearchOptions) {
  const opt: any = { page: o.page ?? 1, size: 15 };
  if (o.bounds) opt.bounds = o.bounds;
  else if (o.lat != null && o.lng != null) {
    opt.location = new kakao.maps.LatLng(o.lat, o.lng);
    opt.radius = Math.min(o.radius ?? 2000, 20000);
  }
  opt.sort = o.sortByDistance && opt.location ? kakao.maps.services.SortBy.DISTANCE : kakao.maps.services.SortBy.ACCURACY;
  return opt;
}

function wrap(kakao: any, resolve: (r: SearchResult) => void, reject: (e: Error) => void) {
  return (data: any[], status: any, pagination: any) => {
    if (status === kakao.maps.services.Status.OK) resolve({ places: data.map(toPlace), hasNext: !!pagination?.hasNextPage });
    else if (status === kakao.maps.services.Status.ZERO_RESULT) resolve({ places: [], hasNext: false });
    else reject(new Error("장소 검색 중 오류가 발생했어요"));
  };
}

export async function keywordSearch(keyword: string, o: SearchOptions = {}): Promise<SearchResult> {
  const kakao = await loadKakaoMap();
  const ps = new kakao.maps.services.Places();
  return new Promise((resolve, reject) => ps.keywordSearch(keyword, wrap(kakao, resolve, reject), buildOptions(kakao, o)));
}

export async function categorySearch(code: string, o: SearchOptions): Promise<SearchResult> {
  const kakao = await loadKakaoMap();
  const ps = new kakao.maps.services.Places();
  return new Promise((resolve, reject) => ps.categorySearch(code, wrap(kakao, resolve, reject), buildOptions(kakao, o)));
}

/** 앱 카테고리(코드 또는 키워드) 기준 검색 */
export async function searchByCategory(
  cat: { kakaoCode?: string; keyword?: string },
  o: SearchOptions,
): Promise<SearchResult> {
  if (cat.kakaoCode) return categorySearch(cat.kakaoCode, o);
  return keywordSearch(cat.keyword ?? "", o);
}

/** 지역명 → 좌표 (첫 번째 검색 결과 사용) */
export async function geocodeRegion(region: string): Promise<{ lat: number; lng: number } | null> {
  const { places } = await keywordSearch(region);
  if (!places.length) return null;
  return { lat: places[0].lat, lng: places[0].lng };
}
