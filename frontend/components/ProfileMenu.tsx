"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/lib/useAuth";
import { BadgeCheck, Check, ChevronsUpDown, Copy, LogOut, UserRound } from "@/components/icons";
import { short } from "@learnit/backend/format";
import { useMe } from "@/lib/useMe";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";
import { Sk } from "./Skeletons";

/** Profile photo that opens a small menu: wallet, profile link and Sign out. */
export function ProfileMenu({ placement = "down", showName = false }: { placement?: "down" | "up"; showName?: boolean }) {
  const { data: me } = useMe();
  const { logout } = useAuth();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!me) return <Sk className={cn("rounded-full", showName ? "h-11 w-full rounded-btn" : "h-9 w-9")} />;
  const name = me.displayName || (me.username ? `@${me.username}` : "Your account");

  async function copy() {
    try { await navigator.clipboard.writeText(me!.wallet); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink-2 transition hover:bg-sunken hover:text-ink";

  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className={cn("transition active:scale-[0.98]", showName ? "flex w-full items-center gap-3 rounded-btn p-1.5 text-left hover:bg-sunken" : "rounded-full")}>
        <Avatar src={me.avatarUrl} name={me.displayName || me.username || "You"} size={showName ? 34 : 34} />
        {showName && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{name}</span>
              <span className="block truncate font-mono text-xs text-muted">{short(me.wallet)}</span>
            </span>
            <ChevronsUpDown size={16} className="text-muted" aria-hidden />
          </>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu"
            initial={reduce ? false : { opacity: 0, y: placement === "up" ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: placement === "up" ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn("absolute z-40 w-72 rounded-card border border-line bg-surface p-2 shadow-float",
              placement === "up" ? "bottom-full left-0 mb-2 origin-bottom-left" : "right-0 top-full mt-2 origin-top-right")}>
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
              <Avatar src={me.avatarUrl} name={name} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                {me.verified
                  ? <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-sage-700"><BadgeCheck size={14} aria-hidden /> GoodDollar verified</p>
                  : me.username && me.displayName && <p className="truncate text-xs text-muted">@{me.username}</p>}
              </div>
            </div>
            <button role="menuitem" onClick={copy} className="flex w-full items-center justify-between gap-3 rounded-input border border-line bg-canvas px-3 py-2.5 text-left transition hover:border-line-strong" aria-label="Copy wallet address">
              <span><span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Wallet</span><span className="font-mono text-[13px] text-ink">{short(me.wallet)}</span></span>
              {copied ? <Check size={16} className="text-sage-700" aria-hidden /> : <Copy size={16} className="text-muted" aria-hidden />}
            </button>
            <div className="mt-2 grid gap-0.5 border-t border-line pt-2">
              <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={item}><UserRound size={16} aria-hidden /> Profile and progress</Link>
              <button role="menuitem" onClick={() => void logout()} className={item}><LogOut size={16} aria-hidden /> Sign out</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
