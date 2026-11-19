"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Mail, Wallet } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "./ui";
import { Logo } from "./Logo";

/** The sign-in screen on the app subdomain. The marketing page lives on the apex domain; this is just the way in. */
export function AppSignIn() {
  const { ready, authenticated, login } = useAuth();
  // Arriving from the public site with ?login=wallet or ?login=email: open that sign-in now, so one press there is enough.
  useEffect(() => {
    if (!ready || authenticated) return;
    const kind = new URLSearchParams(window.location.search).get("login");
    if (kind !== "email" && kind !== "wallet") return;
    window.history.replaceState(null, "", window.location.pathname); // a refresh then does not open it again
    login({ loginMethods: [kind] });
  }, [ready, authenticated, login]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "/";
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href={site} aria-label="LearnIt home"><Logo /></Link>
        <h1 className="mt-8 font-display text-3xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Sign in to pick up your lesson and keep your streak.</p>
        <div className="mt-6 space-y-3">
          <Button size="lg" icon={Mail} block onClick={() => login({ loginMethods: ["email"] })}>Continue with email</Button>
          <Button size="lg" variant="outline" icon={Wallet} block onClick={() => login({ loginMethods: ["wallet"] })}>Connect a wallet</Button>
        </div>
        <p className="mt-4 text-xs text-muted">No wallet? Email creates one for you.</p>
      </div>
    </main>
  );
}
