"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, PiggyBank } from "lucide-react";
import { cn } from "@/lib/cn";

/** Switches between the two money pages: claiming rewards and staking on a streak. */
export function RewardsTabs() {
  const path = usePathname();
  const tabs = [
    { href: "/earn", label: "Rewards", Icon: Coins },
    { href: "/stake", label: "Stake", Icon: PiggyBank },
  ];
  return (
    <nav aria-label="Rewards sections" className="flex w-full rounded-btn bg-sunken p-1 ring-1 ring-inset ring-line sm:inline-flex sm:w-auto">
      {tabs.map(({ href, label, Icon }) => {
        const on = path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-sm font-medium transition duration-200 sm:flex-none sm:py-2",
              on ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink")}>
            <Icon size={16} strokeWidth={2} aria-hidden />{label}
          </Link>
        );
      })}
    </nav>
  );
}
