"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpen, Coins, Home, MessageCircle, Trophy, type IconType } from "@/lib/icons";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { LanguageChip } from "./LanguageChip";
import { ProfileMenu } from "./ProfileMenu";

type NavItem = { href: string; label: string; Icon: IconType; /** other paths that belong under this menu item */ match?: string[]; soon?: boolean };

export const NAV: NavItem[] = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/learn", label: "Learn", Icon: BookOpen },
  { href: "/chat", label: "Chat", Icon: MessageCircle, soon: true },
  { href: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  // One menu for money: Rewards and Stake are two tabs inside it (see RewardsTabs).
  { href: "/earn", label: "Rewards", Icon: Coins, match: ["/stake"] },
];

const isOn = (path: string, item: NavItem) => [item.href, ...(item.match ?? [])].some((p) => path === p || path.startsWith(p + "/"));

/**
 * The signed-in frame. Desktop: a quiet sidebar on the left. Mobile: a top bar and a bottom tab bar.
 * `width` sets the content column: "narrow" for focused, single-column pages like the learning path.
 */
export function AppShell({ children, width = "wide", topRight }: { children: ReactNode; width?: "wide" | "narrow"; topRight?: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur lg:flex">
        <Link href="/home" className="px-2" aria-label="LearnIt home"><Logo /></Link>
        <nav aria-label="Main" className="mt-10">
          <ul className="grid gap-0.5">
            {NAV.map((item) => {
              const { href, label, Icon, soon } = item;
              const on = isOn(path, item);
              return (
                <li key={href}>
                  <Link href={href} aria-current={on ? "page" : undefined}
                    className={cn("group flex items-center gap-3 rounded-btn px-3 py-2.5 text-[15px] font-medium transition duration-150",
                      on ? "bg-ink text-white shadow-card" : "text-ink-2 hover:bg-sunken hover:text-ink")}>
                    <Icon size={18} strokeWidth={on ? 2.25 : 1.85} aria-hidden />
                    {label}
                    {soon && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium", on ? "bg-white/15 text-white" : "bg-sunken text-muted")}>Soon</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto grid gap-3">
          <LanguageChip block />
          <div className="border-t border-line pt-3"><ProfileMenu placement="up" showName /></div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
            <Link href="/home" aria-label="LearnIt home"><Logo compact /></Link>
            <div className="flex items-center gap-2">
              {topRight}
              <LanguageChip />
              <ProfileMenu />
            </div>
          </div>
        </header>

        <main id="main" className={cn("mx-auto px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10", width === "narrow" ? "max-w-2xl" : "max-w-app")}>
          {children}
        </main>
      </div>

      <TabBar />
    </div>
  );
}

/** Mobile bottom navigation. Hidden on desktop, where the sidebar takes over. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md [transform:translateZ(0)] lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV.map((item) => {
          const { href, label, Icon } = item;
          const on = isOn(path, item);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors", on ? "text-ink" : "text-muted hover:text-ink-2")}>
                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors duration-200", on && "bg-sage-100 text-sage-700")}>
                  <Icon size={20} strokeWidth={on ? 2.25 : 1.85} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
