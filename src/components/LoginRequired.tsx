"use client";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginRequired({ children, message = "로그인이 필요해요" }: { children: ReactNode; message?: string }) {
  const { user, loading, loginGoogle, loginKakao } = useAuth();
  if (loading) return <div className="p-10 text-center text-stone-400">불러오는 중…</div>;
  if (!user)
    return (
      <div className="mx-auto mt-20 max-w-sm space-y-3 p-6 text-center card">
        <p className="font-semibold">{message}</p>
        <button onClick={loginKakao} className="btn w-full bg-[#FEE500] text-black">카카오로 시작</button>
        <button onClick={loginGoogle} className="btn-ghost w-full">Google로 시작</button>
      </div>
    );
  return <>{children}</>;
}
