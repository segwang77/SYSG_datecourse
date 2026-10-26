import { NextRequest, NextResponse } from "next/server";

/** ODsay 대중교통 길찾기 프록시 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const [sx, sy, ex, ey] = ["sx", "sy", "ex", "ey"].map((k) => p.get(k));
  if (!sx || !sy || !ex || !ey) return NextResponse.json({ error: "missing params" }, { status: 400 });
  const key = process.env.ODSAY_API_KEY;
  if (!key) return NextResponse.json({ error: "ODSAY_API_KEY not set" }, { status: 500 });

  const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${encodeURIComponent(key)}`;
  // 배포 환경(App Hosting 등)은 서버 IP가 고정되지 않아 IP 등록 방식의 "서버 키"를 쓸 수 없다.
  // 이때는 ODsay에 Web(URI) 플랫폼으로 사이트 주소를 등록하고, 그 주소를 Referer 로 보낸다.
  const referer = process.env.ODSAY_REFERER || process.env.NEXT_PUBLIC_SITE_URL;
  const res = await fetch(url, {
    headers: referer && !referer.includes("localhost") ? { Referer: referer } : undefined,
    next: { revalidate: 600 },
  });
  if (!res.ok) return NextResponse.json({ error: `odsay ${res.status}` }, { status: 502 });
  const data = await res.json();

  if (data.error) {
    const err = Array.isArray(data.error) ? data.error[0] : data.error;
    // -98: 출발지·도착지가 700m 이내 → 도보로 대체
    if (String(err?.code) === "-98") return NextResponse.json({ tooClose: true });
    return NextResponse.json({ error: err?.message ?? err?.msg ?? "odsay error" }, { status: 404 });
  }
  const info = data.result?.path?.[0]?.info;
  if (!info) return NextResponse.json({ error: "no route" }, { status: 404 });
  return NextResponse.json({ minutes: info.totalTime, meters: info.totalDistance, fare: info.payment ?? 0 });
}
