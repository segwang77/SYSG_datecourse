import type { Timestamp } from "firebase/firestore";

/** 카카오 로컬 API 장소 검색 결과를 앱에서 쓰기 좋게 정리한 형태 */
export interface Place {
  id: string; // 카카오 place id (제보 명소는 "spot_<docId>")
  name: string;
  category: string; // 예: "음식점 > 한식 > 육류"
  groupCode: string; // 카카오 카테고리 그룹 코드(FD6, CE7 ...) 또는 앱 자체 코드
  address: string;
  phone?: string;
  lat: number;
  lng: number;
  url?: string; // 카카오맵 장소 상세(사진·영업시간·후기 확인용)
  distance?: number;
  isSpot?: boolean; // 사용자 제보 명소 여부
}

export type TravelMode = "walk" | "transit" | "car";

export interface Travel {
  mode: TravelMode;
  minutes: number;
  meters: number;
  fare?: number; // 대중교통 요금(1인)
  path?: number[]; // 자동차 도로 경로 [lat, lng, lat, lng, ...] (Firestore는 배열 안의 배열을 저장할 수 없어 1차원으로 저장)
  estimated?: boolean; // API 실패 등으로 직선거리 추정치일 때
  to?: string; // 도착지 좌표 키 (순서가 바뀌었는지 감지하는 용도)
  note?: string; // 예: "700m 이내라 걸어서 이동"
}

export interface Stop {
  uid: string; // 코스 내 고유 id (같은 장소가 두 번 들어가도 구분)
  place: Place;
  stayMinutes: number;
  cost: number; // 두 사람 기준 예상 비용(원)
  memo: string;
  travelMode: TravelMode; // 다음 장소로 가는 이동수단
  travel?: Travel | null; // 다음 장소까지 이동 정보 (마지막 장소는 null)
}

export type Visibility = "private" | "link" | "public";
export type CourseStatus = "draft" | "planned" | "done";
export type Mood = "calm" | "active" | "anniversary" | "casual";

export interface LiveState {
  currentIndex: number;
  actualArrivals: Record<string, string>; // stop.uid -> "HH:mm"
  extraStay: Record<string, number>; // stop.uid -> 추가 체류(분)
}

export interface Course {
  id: string;
  ownerId: string;
  ownerName: string;
  members: string[]; // 편집 권한이 있는 uid (owner 포함)
  inviteCode: string;
  title: string;
  description: string;
  date: string | null; // YYYY-MM-DD
  startTime: string; // HH:mm
  region: string;
  tags: string[];
  mood: Mood | null;
  visibility: Visibility;
  status: CourseStatus;
  stops: Stop[];
  totalCost: number;
  likeCount: number;
  scrapCount: number;
  reviewCount: number;
  forkedFrom: string | null;
  live: LiveState | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  completedAt: Timestamp | null;
}

export interface Candidate {
  id: string;
  place: Place;
  addedBy: string;
  addedByName: string;
  votes: string[];
  createdAt: Timestamp | null;
}

export interface Review {
  id: string;
  uid: string;
  userName: string;
  rating: number;
  text: string;
  actualCost: number | null;
  photoURLs: string[];
  createdAt: Timestamp | null;
}

export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  groupCode: string;
  description: string;
  submittedBy: string;
  submittedByName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  anniversary: string | null; // 사귄 날 YYYY-MM-DD
}

export interface TimelineEntry {
  uid: string;
  arrive: string; // HH:mm
  depart: string; // HH:mm
  arriveMin: number; // 자정 기준 분
  departMin: number;
  actual: boolean; // 실제 도착 시각이 기록됐는지
}
