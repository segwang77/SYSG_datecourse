"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import LoginRequired from "@/components/LoginRequired";
import KakaoMap from "@/components/map/KakaoMap";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIES } from "@/lib/categories";
import { submitSpot } from "@/lib/spots";

/** 숨은 명소 제보 — 지도를 눌러 위치 지정 → 관리자 검수 후 노출 */
function SpotForm() {
  const { user } = useAuth();
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [group, setGroup] = useState("walk");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function onPick(lat: number, lng: number) {
    setPick({ lat, lng });
    const { kakao } = window as any;
    new kakao.maps.services.Geocoder().coord2Address(lng, lat, (res: any[], status: any) => {
      if (status === kakao.maps.services.Status.OK) setAddress(res[0].road_address?.address_name ?? res[0].address.address_name);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !pick || !name.trim()) return;
    setBusy(true);
    try {
      await submitSpot(user, { name: name.trim(), description: desc.trim(), lat: pick.lat, lng: pick.lng, address, groupCode: group });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="mx-auto mt-20 max-w-sm text-center">
        <p className="text-4xl">💎</p>
        <p className="mt-2 font-semibold">제보 고마워요!</p>
        <p className="text-sm text-stone-500">검수 후 지도에 &lsquo;숨은 명소&rsquo;로 표시돼요.</p>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-2">
      <div>
        <p className="mb-2 text-sm text-stone-500">지도를 눌러 위치를 지정하세요</p>
        <KakaoMap className="h-[420px] overflow-hidden rounded-xl" pick={pick} onMapClick={onPick} />
      </div>
      <form onSubmit={submit} className="space-y-3">
        <h1 className="text-xl font-bold">숨은 명소 제보</h1>
        <input className="input" placeholder="장소 이름" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="주소 (지도를 누르면 자동 입력)" value={address} onChange={(e) => setAddress(e.target.value)} />
        <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
        <textarea className="input" rows={4} placeholder="어떤 점이 좋은지 알려주세요 (예: 해질녘 강이 보이는 벤치)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn-primary w-full" disabled={busy || !pick || !name.trim()}>{busy ? "보내는 중…" : "제보하기"}</button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <LoginRequired>
      <SpotForm />
    </LoginRequired>
  );
}
