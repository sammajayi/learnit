"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";
import type { PathUnit } from "@/components/LearnPath";

export type Today = { course: "fr" | "es"; level: string; units: PathUnit[]; currentUnit: number; nextLessonId: string | null; streak: number; todayDone: boolean; freezesRemaining: number };

/** The learning path, streak and today's status. Shared by the dashboard, the Learn page and the profile. */
export function useToday() {
  const api = useApi();
  const { ready, authenticated } = useAuth();
  return useQuery({ queryKey: ["today"], queryFn: () => api<Today>("/api/lessons/today"), enabled: ready && authenticated });
}
