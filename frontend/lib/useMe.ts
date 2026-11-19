"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useApi } from "./useApi";

export type Me = { id: string; username: string | null; displayName: string | null; bio: string | null; hasEmail: boolean; avatarUrl: string | null; wallet: `0x${string}`; verified: boolean; root: string | null; verifiedUntil: string | null; timezone: string; course: "fr" | "es"; gasTopupDone: boolean; onboarded: boolean };

export function useMe() {
  const api = useApi();
  const { authenticated, ready } = useAuth();
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/me"), enabled: ready && authenticated, staleTime: 30_000 });
}
