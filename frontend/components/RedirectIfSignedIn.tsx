"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

/** On the landing page: someone who is already signed in, or who just signed in, goes straight to the app. */
export function RedirectIfSignedIn() {
  const { ready, authenticated } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && authenticated) router.replace("/home"); }, [ready, authenticated, router]);
  return null;
}
