"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Coins, Flame, LayoutDashboard, LogOut, RefreshCw, Users, Vault, Wallet } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/Logo";
import { Badge, Button, Notice } from "@/components/ui";
import { useAdmin } from "./AdminProvider";
import { shortAddr } from "./bits";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/challenges", label: "Challenges", Icon: Flame },
  { href: "/admin/users", label: "People", Icon: Users },
  { href: "/admin/ubi", label: "UBI claims", Icon: Coins },
  { href: "/admin/pool", label: "Rewards pool", Icon: Vault },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const a = useAdmin();
  const role = a.roles?.admin ? "Admin" : a.roles?.guardian ? "Guardian" : a.address && !a.rolesLoading ? "Read only" : null;
  const on = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const qc = useQueryClient();
  const fetching = useIsFetching({ queryKey: ["admin"] });
  // Shown only after the first load finishes, so the server and browser render the same thing at first.
  const [updated, setUpdated] = useState<Date | null>(null);
  useEffect(() => { if (fetching === 0) setUpdated(new Date()); }, [fetching]);
  const here = NAV.find((n) => on(n.href))?.label ?? "Admin";
  // One title per page, so tabs and history tell the sections apart.
  useEffect(() => { document.title = `${here} · LearnIt admin`; }, [here]);

  return (
    <div className="min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl 2xl:max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/admin" aria-label="Admin home"><Logo compact /></Link>
          <div className="flex items-center gap-2">
            {updated && <span className="tabular hidden text-xs text-muted md:inline">Updated {updated.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}</span>}
            <Button variant="ghost" size="sm" icon={RefreshCw} loading={fetching > 0} className="max-sm:h-11 max-sm:w-11 max-sm:px-0" aria-label="Refresh data" onClick={() => void qc.invalidateQueries({ queryKey: ["admin"] })}><span className="hidden sm:inline">Refresh</span></Button>
          {a.address ? (
            <>
              {role && <Badge tone={role === "Read only" ? "outline" : "sage"} className="hidden sm:inline-flex">{role}</Badge>}
              <span className="rounded-full border border-line-strong bg-surface px-3 py-1.5 font-mono text-xs text-ink-2">{shortAddr(a.address)}</span>
              <Button variant="ghost" size="sm" icon={LogOut} onClick={a.disconnect} aria-label="Disconnect wallet" className="max-sm:h-11 max-sm:w-11 max-sm:px-0"><span className="hidden sm:inline">Disconnect</span></Button>
            </>
          ) : (
            <Button size="sm" variant="outline" icon={Wallet} loading={a.connecting} onClick={a.connect} disabled={!a.hasInjected} className="max-sm:h-11" title={a.hasInjected ? undefined : "No wallet found in this browser"}>Connect wallet</Button>
          )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl 2xl:max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:py-6">
        <nav aria-label="Admin sections">
          {/* Wraps on a small screen so every section is visible at once, then becomes a sidebar. A scrolling row hid half of them. */}
          <ul className="flex flex-wrap gap-1 lg:sticky lg:top-20 lg:grid lg:gap-0.5">
            {NAV.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link href={href} aria-current={on(href) ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-2 rounded-btn px-2.5 py-2.5 text-sm font-medium transition duration-150 lg:gap-2.5 lg:px-3 lg:text-[15px]",
                    on(href) ? "bg-ink text-white shadow-card" : "text-ink-2 hover:bg-sunken hover:text-ink")}>
                  <Icon size={17} strokeWidth={on(href) ? 2.25 : 1.85} aria-hidden />{label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* A grid column grows to fit its widest child unless told it may shrink. Without this a wide table stretched the whole page instead of scrolling inside its card. */}
        <main id="main" className="min-w-0 [&>.grid]:grid-cols-[minmax(0,1fr)]">
          {a.wrongNetwork && (
            <Notice tone="warning" className="mb-4" title={`Your wallet is on the wrong network`}
              action={<Button variant="outline" size="sm" loading={a.switching} onClick={a.switchNetwork}>Switch to {a.networkName}</Button>}>
              Changes are blocked until it is on {a.networkName}.
            </Notice>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
