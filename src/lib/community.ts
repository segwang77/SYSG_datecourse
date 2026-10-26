"use client";
import {
  addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, limit, updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { User } from "firebase/auth";
import { db, storage } from "./firebase";
import type { Course, Review } from "./types";

/* ── 좋아요: courses/{id}/likes/{uid} + likeCount ─────────── */
export async function isLiked(courseId: string, uid: string) {
  return (await getDoc(doc(db(), "courses", courseId, "likes", uid))).exists();
}

export async function toggleLike(courseId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db(), "courses", courseId, "likes", uid);
  const courseRef = doc(db(), "courses", courseId);
  return runTransaction(db(), async (tx) => {
    const snap = await tx.get(likeRef);
    if (snap.exists()) {
      tx.delete(likeRef);
      tx.update(courseRef, { likeCount: increment(-1) });
      return false;
    }
    tx.set(likeRef, { createdAt: serverTimestamp() });
    tx.update(courseRef, { likeCount: increment(1) });
    return true;
  });
}

/* ── 스크랩: users/{uid}/scraps/{courseId} + scrapCount ────── */
export async function isScrapped(courseId: string, uid: string) {
  return (await getDoc(doc(db(), "users", uid, "scraps", courseId))).exists();
}

export async function toggleScrap(course: Course, uid: string): Promise<boolean> {
  const scrapRef = doc(db(), "users", uid, "scraps", course.id);
  const courseRef = doc(db(), "courses", course.id);
  return runTransaction(db(), async (tx) => {
    const snap = await tx.get(scrapRef);
    if (snap.exists()) {
      tx.delete(scrapRef);
      tx.update(courseRef, { scrapCount: increment(-1) });
      return false;
    }
    tx.set(scrapRef, {
      title: course.title,
      region: course.region,
      stopNames: course.stops.map((s) => s.place.name),
      createdAt: serverTimestamp(),
    });
    tx.update(courseRef, { scrapCount: increment(1) });
    return true;
  });
}

export interface ScrapItem {
  courseId: string;
  title: string;
  region: string;
  stopNames: string[];
}

export async function listScraps(uid: string): Promise<ScrapItem[]> {
  const snap = await getDocs(query(collection(db(), "users", uid, "scraps"), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((d) => ({ courseId: d.id, ...(d.data() as Omit<ScrapItem, "courseId">) }));
}

/* ── 후기 ─────────────────────────────────────────── */
export function subscribeReviews(courseId: string, cb: (r: Review[]) => void) {
  return onSnapshot(query(collection(db(), "courses", courseId, "reviews"), orderBy("createdAt", "desc")), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) }))),
  );
}

export async function addReview(
  courseId: string,
  user: User,
  input: { rating: number; text: string; actualCost: number | null; photos: File[] },
) {
  const photoURLs: string[] = [];
  for (const file of input.photos.slice(0, 4)) {
    const r = ref(storage(), `reviews/${courseId}/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(r, file, { contentType: file.type });
    photoURLs.push(await getDownloadURL(r));
  }
  await addDoc(collection(db(), "courses", courseId, "reviews"), {
    uid: user.uid,
    userName: user.displayName ?? "익명",
    rating: input.rating,
    text: input.text,
    actualCost: input.actualCost,
    photoURLs,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db(), "courses", courseId), { reviewCount: increment(1) });
}
