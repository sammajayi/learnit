"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";

export function useAuthGate() {
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  const { data: me } = useMe();
  useEffect(() => { if (ready && !authenticated) router.replace("/"); }, [ready, authenticated, router]);
  useEffect(() => { if (me && !me.onboarded) router.replace("/home"); }, [me, router]);
  return ready && authenticated;
}
