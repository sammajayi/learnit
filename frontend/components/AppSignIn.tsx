"use client";
import Link from "next/link";
import { Mail, Wallet } from "@/lib/icons";
import { useAuth } from "@/lib/useAuth";
import { Button } from "./ui";
import { Logo } from "./Logo";

/** The sign-in screen on the app subdomain. The marketing page lives on the apex domain; this is just the way in. */
export function AppSignIn() {
  const { login } = useAuth();
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
