"use client";
import { useEffect, useState } from "react";
import LoginRequired from "@/components/LoginRequired";
import KakaoMap from "@/components/map/KakaoMap";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin, listSpots, setSpotStatus, spotToPlace } from "@/lib/spots";
import type { Spot } from "@/lib/types";

/** 관리자: 명소 제보 검수 (Firestore 에 admins/{uid} 문서를 만들어 권한 부여) */
function Admin() {
  const { user } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Spot["status"]>("pending");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [sel, setSel] = useState<Spot | null>(null);

  useEffect(() => {
    if (user) isAdmin(user.uid).then(setOk).catch(() => setOk(false));
  }, [user]);
  useEffect(() => {
    if (ok) listSpots(status).then(setSpots);
  }, [ok, status]);

  if (ok === null) return <p className="p-10 text-center text-stone-400">확인 중…</p>;
  if (!ok) return <p className="p-10 text-center text-stone-500">관리자만 볼 수 있어요</p>;

  const act = async (s: Spot, st: Spot["status"]) => {
    await setSpotStatus(s.id, st);
    setSpots((l) => l.filter((x) => x.id !== s.id));
    setSel(null);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <h1 className="text-xl font-bold">명소 제보 검수</h1>
        <div className="flex gap-2 text-sm">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? "border-rose-400 bg-rose-50" : "border-stone-200"}`}>
              {s === "pending" ? "대기" : s === "approved" ? "승인" : "반려"}
            </button>
          ))}
        </div>
        {!spots.length && <p className="text-stone-400">항목이 없어요</p>}
        {spots.map((s) => (
          <div key={s.id} className={`card p-3 ${sel?.id === s.id ? "border-rose-400" : ""}`} onClick={() => setSel(s)}>
            <p className="font-semibold">{s.name}</p>
            <p className="text-xs text-stone-500">{s.address} · {s.submittedByName}</p>
            <p className="mt-1 text-sm">{s.description}</p>
            <div className="mt-2 flex gap-2">
              {status !== "approved" && <button className="btn-primary px-2 py-1 text-xs" onClick={() => act(s, "approved")}>승인</button>}
              {status !== "rejected" && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act(s, "rejected")}>반려</button>}
            </div>
          </div>
        ))}
      </div>
      <KakaoMap
        className="h-[70vh] overflow-hidden rounded-xl md:sticky md:top-18"
        places={spots.map(spotToPlace)}
        selectedPlaceId={sel ? `spot_${sel.id}` : null}
        center={sel ? { lat: sel.lat, lng: sel.lng } : undefined}
      />
    </div>
  );
}

export default function Page() {
  return (
    <LoginRequired>
      <Admin />
    </LoginRequired>
  );
}
