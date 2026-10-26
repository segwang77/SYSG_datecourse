import { NextRequest, NextResponse } from "next/server";

/** 카카오모빌리티 자동차 길찾기 프록시 (REST 키를 브라우저에 노출하지 않기 위해 서버에서 호출) */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const [sx, sy, ex, ey] = ["sx", "sy", "ex", "ey"].map((k) => p.get(k));
  if (!sx || !sy || !ex || !ey) return NextResponse.json({ error: "missing params" }, { status: 400 });
  const key = process.env.KAKAO_REST_KEY;
  if (!key) return NextResponse.json({ error: "KAKAO_REST_KEY not set" }, { status: 500 });

  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${sx},${sy}&destination=${ex},${ey}&priority=RECOMMEND`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, next: { revalidate: 600 } });
  if (!res.ok) return NextResponse.json({ error: `kakao ${res.status}` }, { status: 502 });
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route || route.result_code !== 0) {
    // 104: 출발지와 도착지가 5m 이내
    if (route?.result_code === 104) return NextResponse.json({ tooClose: true });
    return NextResponse.json({ error: route?.result_msg ?? "no route" }, { status: 404 });
  }

  // 도로 경로 좌표 (x,y 반복) → [lat,lng], Firestore 용량을 위해 최대 150개로 줄임
  const flat: number[] = route.sections.flatMap((s: { roads: { vertexes: number[] }[] }) => s.roads.flatMap((r) => r.vertexes));
  const pts: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i + 1], flat[i]]);
  const step = Math.max(1, Math.ceil(pts.length / 150));
  // Firestore 저장을 위해 1차원 배열로 [lat, lng, lat, lng, ...]
  const path = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).flat();

  return NextResponse.json({
    minutes: Math.max(1, Math.round(route.summary.duration / 60)),
    meters: route.summary.distance,
    path,
  });
}
