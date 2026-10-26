# 💕 데이트코스: 지도 기반 데이트 코스 플래너

Next.js 15 (App Router) + TypeScript + Tailwind v4 + Firebase + 카카오맵

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev                  # http://localhost:3000
```

## 필요한 외부 API 키

| 키 | 발급처 | 용도 | 비고 |
|---|---|---|---|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | developers.kakao.com → 앱 → JavaScript 키 | 지도, 장소 검색, 카카오톡 공유 | **플랫폼 > Web**에 `http://localhost:3000`과 배포 도메인을 등록해야 해요. **카카오맵 사용 설정 ON**도 필요해요 |
| `KAKAO_REST_KEY` | 같은 앱의 REST API 키 | 자동차 길찾기 (카카오모빌리티) | 서버에서만 사용해요 |
| `ODSAY_API_KEY` | lab.odsay.com | 대중교통 소요시간·요금 | "서버" 키로 발급하고 배포 서버 IP를 등록하세요 |
| `OPENWEATHER_API_KEY` | openweathermap.org | 5일 날씨 예보 | 무료 플랜으로 충분해요 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase 콘솔 → 프로젝트 설정 → 웹 앱 | 인증, DB, 사진 저장 | |

키가 없거나 호출이 실패하면 대중교통·자동차 시간은 **직선거리 기반 추정치**로 대신 표시돼요(화면에 "(추정)"으로 표시).

## Firebase 설정

1. **Authentication**
   - Google 로그인을 켜세요.
   - 카카오 로그인은 Identity Platform으로 업그레이드한 뒤 **OpenID Connect** 공급자를 추가하세요.
     - Provider ID: `kakao` (코드에서는 `oidc.kakao`로 사용)
     - Issuer: `https://kauth.kakao.com`
     - Client ID와 Secret: 카카오 REST 키와 Client Secret
     - 카카오 콘솔에서 **OpenID Connect 활성화**를 켜고, Redirect URI에 `https://<프로젝트>.firebaseapp.com/__/auth/handler`를 등록하세요.
2. **Firestore / Storage**: 아래 명령으로 보안 규칙과 색인을 배포하세요.
   ```bash
   npm i -g firebase-tools && firebase login && firebase use <프로젝트ID>
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
3. **관리자 지정**(명소 제보 검수): Firestore 콘솔에서 `admins/{내 uid}` 문서를 빈 문서로 만드세요. 그러면 `/admin` 페이지를 쓸 수 있어요.

## 기능 ↔ 코드 위치

### 1차 (MVP)
| 기능 | 위치 |
|---|---|
| 카테고리 탐색(맛집/카페/전시/산책/액티비티/술집/명소), 키워드 검색, 현재 지도에서 재검색, 실내·실외 필터 | `components/search/PlaceSearch.tsx`, `lib/kakao.ts`, `lib/categories.ts` |
| 번호 마커와 이동수단별 경로선(차는 실제 도로 경로) | `components/map/KakaoMap.tsx` |
| 드래그로 순서 변경, 체류시간, 비용, 메모 | `components/editor/StopList.tsx` |
| 구간별 도보/대중교통/차 시간·거리 자동 계산 | `lib/routing.ts`, `app/api/directions`, `app/api/transit` |
| 타임라인 자동 생성, 총비용(대중교통 요금 포함) | `lib/timeline.ts` |
| 소셜 로그인, 내 코스, 초안/예정/완료 상태 | `hooks/useAuth.tsx`, `app/me` |
| 링크 공유(비로그인 열람), 카카오톡 공유 | `components/course/ShareButtons.tsx`, `app/c/[id]` |

### 2차
| 기능 | 위치 |
|---|---|
| 조건형 추천(지역·시간·예산·분위기·날씨 → 3개 코스) | `lib/recommend.ts#recommendCourse`, `app/recommend` |
| 앵커 기반 주변 추천(앞/뒤에 넣기) | `lib/recommend.ts#recommendAround`, `components/editor/AroundPanel.tsx` |
| 비 예보 시 실외 장소를 실내 대안으로 교체 | `app/api/weather`, `CourseEditor.tsx`의 비 예보 배너 |
| 공개 코스 둘러보기(지역·테마·인기/최신) | `app/explore` |
| 좋아요, 스크랩, 내 코스로 가져오기, 후기(사진·한줄평·실제 비용) | `lib/community.ts`, `components/course/ReviewSection.tsx` |
| 초대 링크 공동 편집(실시간 동기화) | `app/join/[id]`, `lib/courses.ts#joinCourse`, Firestore `onSnapshot` |
| 후보 장소 투표 | `components/editor/CandidatePanel.tsx` |

### 3차
| 기능 | 위치 |
|---|---|
| 당일 모드: 현재 단계 강조, 내 위치, 근처 도착 감지, 길찾기 앱 연결, 지연 시 이후 일정 재계산 | `app/c/[id]/live` |
| 기록장: 월별 아카이브, 자주 간 곳 지도, 사귄 날 기준 D-day | `app/me/records`, `lib/anniversary.ts` |
| 예약 바로가기(캐치테이블·네이버) | `lib/links.ts#reservationLinks` |
| 테마 컬렉션(비 오는 날, 5만원 이하, 첫 데이트 등) | `lib/collections.ts`, `app/collections` |
| 숨은 명소 제보와 관리자 검수 | `app/spots/new`, `app/admin`, 검색 탭의 "💎 숨은 명소" |

## 데이터 구조 (Firestore)

```
courses/{id}
  ownerId, members[], inviteCode, title, description, date, startTime,
  region, tags[], mood, visibility(private|link|public), status(draft|planned|done),
  stops[]: { uid, place, stayMinutes, cost, memo, travelMode, travel{mode,minutes,meters,fare,path} }
  totalCost, likeCount, scrapCount, reviewCount, forkedFrom,
  live{ currentIndex, actualArrivals{}, extraStay{} }
  ├ likes/{uid}
  ├ candidates/{id}   { place, votes[] }
  └ reviews/{id}      { rating, text, actualCost, photoURLs[] }
users/{uid}           { displayName, anniversary }
  └ scraps/{courseId}
spots/{id}            { name, lat, lng, status(pending|approved|rejected) }
admins/{uid}
```

## 외부 API의 한계와 대응

- **카카오 로컬 API에는 사진, 영업시간, 평점, 가격 정보가 없어요.** 그래서 장소 카드에 "사진·영업시간 ↗" 링크를 달아 카카오맵 상세 페이지로 연결하고, 비용은 카테고리별 기본값을 넣은 뒤 사용자가 고칠 수 있게 했어요. 같은 이유로 "영업 중" 필터와 "가격대" 필터는 넣지 않았어요. 필요하면 Google Places API(유료)를 추가로 붙이면 돼요.
- 예약 링크는 각 서비스의 **검색 결과 페이지**로 연결해요. 공식 제휴 API가 아니라서 URL 형식이 바뀔 수 있어요.
- 기념일은 **앱 안의 D-day 배너**로만 알려줘요. 푸시 알림까지 하려면 FCM과 Cloud Functions 스케줄러가 필요해요.
- 공동 편집은 코스 문서 하나를 실시간으로 동기화하는 방식이라, 두 사람이 **같은 순간에** 수정하면 나중에 저장한 쪽이 이겨요(last-write-wins).
