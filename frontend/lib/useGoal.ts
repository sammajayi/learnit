"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "./useApi";
import { useAuth } from "./useAuth";

export type Goal = { reason: string; goalDays: 7 | 14 | 30; createdAt: string };

/** The learner's goal note (why they are learning and the streak length they picked), or null. */
export function useGoal() {
  const api = useApi();
  const { ready, authenticated } = useAuth();
  return useQuery({ queryKey: ["goal"], queryFn: async () => (await api<{ goal: Goal | null }>("/api/goal")).goal, enabled: ready && authenticated });
}
