"use client";
import { useParams } from "next/navigation";
import LoginRequired from "@/components/LoginRequired";
import CourseEditor from "@/components/editor/CourseEditor";
import { useAuth } from "@/hooks/useAuth";

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return user ? <CourseEditor courseId={id} user={user} /> : null;
}

export default function EditPage() {
  return (
    <LoginRequired>
      <Inner />
    </LoginRequired>
  );
}
