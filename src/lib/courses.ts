"use client";
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where, type DocumentData, type QueryConstraint,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { categoryOf } from "./categories";
import { totalCost } from "./timeline";
import type { Candidate, Course, Place, Stop } from "./types";

function randomCode(len = 10) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function newStop(place: Place): Stop {
  const cat = categoryOf(place.groupCode, place.category);
  return {
    uid: crypto.randomUUID(),
    place,
    stayMinutes: cat.defaultStay,
    cost: cat.defaultCost,
    memo: "",
    travelMode: "walk",
    travel: null,
  };
}

export function toCourse(id: string, d: DocumentData): Course {
  return {
    id,
    ownerId: d.ownerId,
    ownerName: d.ownerName ?? "",
    members: d.members ?? [],
    inviteCode: d.inviteCode ?? "",
    title: d.title ?? "",
    description: d.description ?? "",
    date: d.date ?? null,
    startTime: d.startTime ?? "12:00",
    region: d.region ?? "",
    tags: d.tags ?? [],
    mood: d.mood ?? null,
    visibility: d.visibility ?? "private",
    status: d.status ?? "draft",
    stops: d.stops ?? [],
    totalCost: d.totalCost ?? 0,
    likeCount: d.likeCount ?? 0,
    scrapCount: d.scrapCount ?? 0,
    reviewCount: d.reviewCount ?? 0,
    forkedFrom: d.forkedFrom ?? null,
    live: d.live ?? null,
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
    completedAt: d.completedAt ?? null,
  };
}

const coursesCol = () => collection(db(), "courses");

export async function createCourse(user: User, init: Partial<Course> = {}): Promise<string> {
  const stops = init.stops ?? [];
  const ref = await addDoc(coursesCol(), {
    ownerId: user.uid,
    ownerName: user.displayName ?? "익명",
    members: [user.uid],
    inviteCode: randomCode(),
    title: init.title ?? "새 데이트 코스",
    description: init.description ?? "",
    date: init.date ?? null,
    startTime: init.startTime ?? "13:00",
    region: init.region ?? "",
    tags: init.tags ?? [],
    mood: init.mood ?? null,
    visibility: "private",
    status: "draft",
    stops,
    totalCost: totalCost(stops),
    likeCount: 0,
    scrapCount: 0,
    reviewCount: 0,
    forkedFrom: init.forkedFrom ?? null,
    live: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  });
  return ref.id;
}

export function subscribeCourse(id: string, cb: (c: Course | null) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    doc(db(), "courses", id),
    (snap) => cb(snap.exists() ? toCourse(snap.id, snap.data()) : null),
    (e) => onError?.(e),
  );
}

export async function getCourse(id: string): Promise<Course | null> {
  const snap = await getDoc(doc(db(), "courses", id));
  return snap.exists() ? toCourse(snap.id, snap.data()) : null;
}

type EditableFields = Omit<Course, "id" | "ownerId" | "members" | "inviteCode" | "likeCount" | "scrapCount" | "reviewCount" | "createdAt">;

export async function updateCourse(id: string, patch: Partial<EditableFields>) {
  const data: DocumentData = { ...patch, updatedAt: serverTimestamp() };
  if (patch.stops) data.totalCost = totalCost(patch.stops);
  await updateDoc(doc(db(), "courses", id), data);
}

export async function deleteCourse(id: string) {
  await deleteDoc(doc(db(), "courses", id));
}

export async function listMyCourses(uid: string): Promise<Course[]> {
  const q = query(coursesCol(), where("members", "array-contains", uid), orderBy("updatedAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

export async function listDoneCourses(uid: string): Promise<Course[]> {
  const q = query(coursesCol(), where("members", "array-contains", uid), where("status", "==", "done"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

export interface PublicQuery {
  region?: string;
  tag?: string;
  sort?: "popular" | "recent";
  max?: number;
}

export async function listPublicCourses(opts: PublicQuery = {}): Promise<Course[]> {
  const cs: QueryConstraint[] = [where("visibility", "==", "public")];
  if (opts.region) cs.push(where("region", "==", opts.region));
  if (opts.tag) cs.push(where("tags", "array-contains", opts.tag));
  cs.push(orderBy(opts.sort === "recent" ? "createdAt" : "likeCount", "desc"));
  cs.push(limit(opts.max ?? 30));
  const snap = await getDocs(query(coursesCol(), ...cs));
  return snap.docs.map((d) => toCourse(d.id, d.data()));
}

/** 다른 사람의 공개 코스를 내 코스로 복사 (이동정보·메모 유지, 당일 기록은 초기화) */
export async function forkCourse(src: Course, user: User): Promise<string> {
  return createCourse(user, {
    title: `${src.title} (가져옴)`,
    description: src.description,
    startTime: src.startTime,
    region: src.region,
    tags: src.tags,
    mood: src.mood,
    stops: src.stops,
    forkedFrom: src.id,
  });
}

/** 초대 링크로 공동 편집자 합류. 보안 규칙에서 joinCode == inviteCode 를 검사한다. */
export async function joinCourse(id: string, code: string, uid: string) {
  await updateDoc(doc(db(), "courses", id), { members: arrayUnion(uid), joinCode: code });
}

export async function markDone(id: string, done: boolean) {
  await updateDoc(doc(db(), "courses", id), {
    status: done ? "done" : "planned",
    completedAt: done ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

/* ── 후보 장소 투표 ─────────────────────────────── */
const candCol = (courseId: string) => collection(db(), "courses", courseId, "candidates");

export function subscribeCandidates(courseId: string, cb: (c: Candidate[]) => void) {
  return onSnapshot(query(candCol(courseId), orderBy("createdAt", "asc")), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Candidate, "id">) }))),
  );
}

export async function addCandidate(courseId: string, place: Place, user: User) {
  await addDoc(candCol(courseId), {
    place,
    addedBy: user.uid,
    addedByName: user.displayName ?? "익명",
    votes: [user.uid],
    createdAt: serverTimestamp(),
  });
}

export async function toggleVote(courseId: string, cand: Candidate, uid: string) {
  const voted = cand.votes.includes(uid);
  await updateDoc(doc(candCol(courseId), cand.id), { votes: voted ? arrayRemove(uid) : arrayUnion(uid) });
}

export async function removeCandidate(courseId: string, candId: string) {
  await deleteDoc(doc(candCol(courseId), candId));
}
