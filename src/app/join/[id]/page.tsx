"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import LoginRequired from "@/components/LoginRequired";
import { useAuth } from "@/hooks/useAuth";
import { joinCourse } from "@/lib/courses";

function Joiner() {
  const { id } = useParams<{ id: string }>();
  const code = useSearchParams().get("code") ?? "";
  const { user } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    done.current = true;
    joinCourse(id, code, user.uid)
      .then(() => router.replace(`/course/${id}/edit`))
      .catch(() => setErr("초대 링크가 올바르지 않거나 만료되었어요"));
  }, [user, id, code, router]);

  return <div className="p-10 text-center text-stone-500">{err ?? "코스에 합류하는 중…"}</div>;
}

export default function JoinPage() {
  return (
    <LoginRequired message="함께 코스를 짜려면 로그인해 주세요">
      <Suspense>
        <Joiner />
      </Suspense>
    </LoginRequired>
  );
}
