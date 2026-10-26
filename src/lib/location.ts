"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadKakaoMap } from "./kakao";

export interface MyLocation {
  lat: number;
  lng: number;
  label: string; // 예: "성동구 성수동1가"
  dong: string; // 예: "성수동1가" (코스 지역명으로 사용)
}

/** 브라우저 위치 권한 요청 → 좌표 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 기능을 지원하지 않아요"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => {
        if (e.code === e.PERMISSION_DENIED)
          reject(new Error("위치 권한이 거부됐어요. 주소창 왼쪽 자물쇠 아이콘 → 위치 → 허용으로 바꿔 주세요."));
        else if (e.code === e.TIMEOUT) reject(new Error("위치를 찾는 데 시간이 너무 오래 걸려요. 다시 시도해 주세요."));
        else reject(new Error("현재 위치를 찾지 못했어요"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/** 좌표 → 행정동 이름 (카카오 Geocoder) */
export async function regionName(lat: number, lng: number): Promise<{ label: string; dong: string }> {
  const kakao = await loadKakaoMap();
  const geocoder = new kakao.maps.services.Geocoder();
  return new Promise((resolve) => {
    geocoder.coord2RegionCode(lng, lat, (res: any[], status: any) => {
      if (status !== kakao.maps.services.Status.OK || !res.length) return resolve({ label: "현재 위치", dong: "" });
      const r = res.find((x) => x.region_type === "H") ?? res[0]; // H: 행정동
      resolve({ label: `${r.region_2depth_name} ${r.region_3depth_name}`.trim(), dong: r.region_3depth_name });
    });
  });
}

export async function locateMe(): Promise<MyLocation> {
  const pos = await getCurrentPosition();
  const name = await regionName(pos.lat, pos.lng);
  return { ...pos, ...name };
}

/** 지금 시각을 다음 30분 단위로 올림 (예: 14:07 → 14:30) */
export function nextHalfHour(): string {
  const d = new Date();
  const m = d.getHours() * 60 + d.getMinutes();
  const up = Math.min(Math.ceil((m + 1) / 30) * 30, 23 * 60 + 30);
  return `${String(Math.floor(up / 60)).padStart(2, "0")}:${String(up % 60).padStart(2, "0")}`;
}
