"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { LessonPlayer } from "@/components/LessonPlayer";

export default function LessonPage({ params }: { params: { id: string } }) {
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !authenticated) router.replace("/"); }, [ready, authenticated, router]);
  if (!ready || !authenticated) return null;
  return <LessonPlayer id={params.id} />;
}
