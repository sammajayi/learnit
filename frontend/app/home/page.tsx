"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { Home } from "@/components/Home";
import { Onboarding } from "@/components/Onboarding";
import { BootSkeleton } from "@/components/Skeletons";
import { useMe } from "@/lib/useMe";

/** The signed-in app home. Signed-out visitors go back to the landing page at /. */
export default function AppHome() {
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  const { data: me } = useMe();
  useEffect(() => { if (ready && !authenticated) router.replace("/"); }, [ready, authenticated, router]);
  if (!ready || !authenticated) return <BootSkeleton />;
  if (me && !me.onboarded) return <Onboarding />;
  return <Home />;
}
