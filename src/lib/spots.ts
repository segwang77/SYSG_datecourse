"use client";
import {
  addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { Place, Spot, UserProfile } from "./types";

/* ── 숨은 명소 제보 ─────────────────────────────── */
export async function submitSpot(user: User, input: Omit<Spot, "id" | "submittedBy" | "submittedByName" | "status" | "createdAt">) {
  await addDoc(collection(db(), "spots"), {
    ...input,
    submittedBy: user.uid,
    submittedByName: user.displayName ?? "익명",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function listSpots(status: Spot["status"]): Promise<Spot[]> {
  const snap = await getDocs(query(collection(db(), "spots"), where("status", "==", status), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Spot, "id">) }));
}

export async function setSpotStatus(id: string, status: Spot["status"]) {
  await updateDoc(doc(db(), "spots", id), { status });
}

export function spotToPlace(s: Spot): Place {
  return {
    id: `spot_${s.id}`,
    name: s.name,
    category: `숨은 명소 > ${s.description.slice(0, 20)}`,
    groupCode: "spot",
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    isSpot: true,
  };
}

/** 관리자 여부: admins/{uid} 문서가 존재하면 관리자 (Firebase 콘솔에서 직접 생성) */
export async function isAdmin(uid: string) {
  return (await getDoc(doc(db(), "admins", uid))).exists();
}

/* ── 사용자 프로필 ─────────────────────────────── */
export async function ensureProfile(user: User) {
  const r = doc(db(), "users", user.uid);
  const snap = await getDoc(r);
  if (!snap.exists()) {
    await setDoc(r, { displayName: user.displayName ?? "익명", photoURL: user.photoURL ?? null, anniversary: null, createdAt: serverTimestamp() });
  }
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { uid, displayName: d.displayName, photoURL: d.photoURL ?? null, anniversary: d.anniversary ?? null };
}

export async function setAnniversary(uid: string, date: string | null) {
  await updateDoc(doc(db(), "users", uid), { anniversary: date });
}
