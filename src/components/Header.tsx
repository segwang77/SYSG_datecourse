"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { href: "/recommend", label: "코스 추천" },
  { href: "/explore", label: "둘러보기" },
  { href: "/collections", label: "테마" },
  { href: "/me", label: "내 코스" },
  { href: "/me/records", label: "기록장" },
];

export default function Header() {
  const { user, loading, loginGoogle, loginKakao, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="text-lg font-bold text-rose-500">💕 데이트코스</Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-md px-3 py-1.5 text-sm ${path === n.href ? "bg-rose-50 text-rose-600" : "text-stone-600 hover:bg-stone-100"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/course/new" className="btn-primary">+ 코스 만들기</Link>
          {loading ? null : user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-sm">
                {user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : (user.displayName?.[0] ?? "나")}
              </button>
              {open && (
                <div className="card absolute right-0 mt-2 w-44 p-1 shadow-lg" onClick={() => setOpen(false)}>
                  <p className="px-3 py-2 text-xs text-stone-500">{user.displayName}</p>
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href} className="block rounded px-3 py-2 text-sm hover:bg-stone-100 md:hidden">{n.label}</Link>
                  ))}
                  <Link href="/spots/new" className="block rounded px-3 py-2 text-sm hover:bg-stone-100">명소 제보하기</Link>
                  <button onClick={logout} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-stone-100">로그아웃</button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="btn-ghost">로그인</button>
              {open && (
                <div className="card absolute right-0 mt-2 w-48 space-y-1 p-2 shadow-lg" onClick={() => setOpen(false)}>
                  <button onClick={loginKakao} className="btn w-full bg-[#FEE500] text-black">카카오로 시작</button>
                  <button onClick={loginGoogle} className="btn-ghost w-full">Google로 시작</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
