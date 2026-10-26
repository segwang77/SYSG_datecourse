"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureProfile } from "@/lib/spots";

interface AuthState {
  user: User | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  loginKakao: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      setLoading(false);
      if (u) ensureProfile(u).catch(console.error);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    loginGoogle: async () => {
      await signInWithPopup(auth(), new GoogleAuthProvider());
    },
    // 카카오 로그인: Firebase Authentication > 로그인 방법 > OpenID Connect 에 "oidc.kakao" 로 등록 필요
    loginKakao: async () => {
      const provider = new OAuthProvider("oidc.kakao");
      provider.addScope("openid");
      await signInWithPopup(auth(), provider);
    },
    logout: () => signOut(auth()),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider 안에서 사용하세요");
  return v;
}
