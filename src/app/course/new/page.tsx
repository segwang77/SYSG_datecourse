"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoginRequired from "@/components/LoginRequired";
import { useAuth } from "@/hooks/useAuth";
import { createCourse } from "@/lib/courses";

function Creator() {
  const { user } = useAuth();
  const router = useRouter();
  const started = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    createCourse(user).then((id) => router.replace(`/course/${id}/edit`)).catch((e) => setErr(e.message));
  }, [user, router]);
  return <div className="p-10 text-center text-stone-400">{err ?? "새 코스를 만드는 중…"}</div>;
}

export default function NewCoursePage() {
  return (
    <LoginRequired message="코스를 만들려면 로그인해 주세요">
      <Creator />
    </LoginRequired>
  );
}
