"use client";
import { useEffect, useState } from "react";
import { addReview, subscribeReviews } from "@/lib/community";
import { formatWon } from "@/lib/geo";
import { useAuth } from "@/hooks/useAuth";
import type { Review } from "@/lib/types";

export default function ReviewSection({ courseId, plannedCost }: { courseId: string; plannedCost: number }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [cost, setCost] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeReviews(courseId, setReviews), [courseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      await addReview(courseId, user, { rating, text: text.trim(), actualCost: cost ? Number(cost) : null, photos });
      setText("");
      setCost("");
      setPhotos([]);
    } finally {
      setBusy(false);
    }
  }

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const costs = reviews.filter((r) => r.actualCost != null).map((r) => r.actualCost!);
  const avgCost = costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold">후기 {reviews.length}</h2>
        {avg && <span className="text-sm text-amber-600">★ {avg}</span>}
        {avgCost != null && (
          <span className="text-xs text-stone-500">
            실제 평균 {formatWon(avgCost)} (예상 {formatWon(plannedCost)})
          </span>
        )}
      </div>

      {user ? (
        <form onSubmit={submit} className="card space-y-2 p-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} className={`text-xl ${n <= rating ? "text-amber-400" : "text-stone-300"}`}>★</button>
            ))}
          </div>
          <input className="input" placeholder="한줄평" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
          <div className="flex flex-wrap gap-2">
            <input className="input flex-1" type="number" placeholder="실제로 쓴 비용 (원)" value={cost} onChange={(e) => setCost(e.target.value)} />
            <label className="btn-ghost cursor-pointer">
              📷 사진 {photos.length ? `${photos.length}장` : ""}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 4))} />
            </label>
            <button className="btn-primary" disabled={busy || !text.trim()}>{busy ? "올리는 중…" : "후기 남기기"}</button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-stone-400">로그인하면 후기를 남길 수 있어요</p>
      )}

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="card p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{r.userName}</span>
              <span className="text-amber-500">{"★".repeat(r.rating)}</span>
              {r.actualCost != null && <span className="text-xs text-stone-500">💰 {formatWon(r.actualCost)}</span>}
            </div>
            <p className="mt-1 text-sm">{r.text}</p>
            {r.photoURLs.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {r.photoURLs.map((u) => <img key={u} src={u} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
