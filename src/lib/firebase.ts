"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 서버 렌더링 중에는 초기화하지 않도록 모두 지연 초기화한다.
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

function app(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function auth(): Auth {
  return getAuth(app());
}

export function db(): Firestore {
  if (!_db) {
    try {
      // undefined 필드를 자동으로 무시 (Stop.travel 등 선택 필드)
      _db = initializeFirestore(app(), { ignoreUndefinedProperties: true });
    } catch {
      _db = getFirestore(app());
    }
  }
  return _db;
}

export function storage(): FirebaseStorage {
  return getStorage(app());
}
