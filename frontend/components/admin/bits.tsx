"use client";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Copy, Check } from "lucide-react";
import { parseUnits } from "viem";
import { Button, Notice } from "@/components/ui";
import type { ActivityDay, UbiDay } from "./data";

export const when = (s: number) => new Date(s * 1000).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const parseG = (v: string): bigint | null => {
  const t = v.trim();
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  try { return parseUnits(t, 18); } catch { return null; }
};

/** A transaction the connected wallet cannot send (the Safe is the admin): address and calldata to paste into the Safe app. */
export function SafeTx({ to, data, note }: { to: string; data: `0x${string}`; note: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(data).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };
  return (
    <div className="grid gap-3 rounded-input border border-line bg-sunken p-4 text-sm">
      <p className="text-pretty leading-relaxed text-ink-2">{note}</p>
      <div>
        <p className="text-xs font-medium text-muted">To</p>
        <p className="mt-0.5 break-all font-mono text-xs text-ink">{to}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted">Data</p>
        <p className="mt-0.5 max-h-24 overflow-auto break-all font-mono text-xs text-ink">{data}</p>
      </div>
      <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={copy} className="justify-self-start">{copied ? "Copied" : "Copy data"}</Button>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const detail = error instanceof Error ? error.message : null;
  return <Notice tone="danger" title="We could not load these numbers">Try again in a moment.{detail ? ` (${detail})` : ""}</Notice>;
}

/**
 * A button for an action that cannot be undone. The first click shows what will happen; a second, labelled click sends it.
 * Focus lands on the safe choice, so a stray Enter keeps things as they are.
 */
export function ConfirmAction({ label, confirmLabel, consequence, onConfirm, loading, disabled, icon, className }: {
  label: string; confirmLabel: string; consequence: ReactNode; onConfirm: () => void | Promise<void>; loading?: boolean; disabled?: boolean; icon?: LucideIcon; className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button variant="outline" size="sm" icon={icon} className={className} disabled={disabled} onClick={() => setAsking(true)}>{label}</Button>;
  return (
    <div role="group" aria-label={label} className={`grid gap-3 rounded-input border border-coral-100 bg-coral-50 p-4 text-sm ${className ?? ""}`}>
      <p className="text-pretty leading-relaxed text-ink-2">{consequence}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={loading} onClick={async () => { try { await onConfirm(); } finally { setAsking(false); } }}>{confirmLabel}</Button>
        <Button size="sm" variant="ghost" disabled={loading} onClick={() => setAsking(false)} autoFocus>Keep it as it is</Button>
      </div>
    </div>
  );
}

/** The last `n` UTC days, oldest first, with zeros for days nobody claimed. */
export function fillDays(days: UbiDay[], n: number): UbiDay[] {
  const by = new Map(days.map((d) => [d.day, d]));
  const out: UbiDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push(by.get(k) ?? { day: k, claims: 0, claimers: 0, total: "0" });
  }
  return out;
}


/** Whole G$ as a plain number, for charts. Precision below a thousandth is irrelevant at chart scale. */
export const gdNum = (wei: bigint | string) => Number(BigInt(wei) / 10n ** 14n) / 10_000;

/** "Mar 4" for a UTC date key. */
export const dayLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/** The last `n` UTC days of the activity series, oldest first, with zeros for any day the server left out. */
export function fillActivity(rows: ActivityDay[], n: number): ActivityDay[] {
  const by = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: n }, (_, i) => {
    const k = new Date(Date.now() - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return by.get(k) ?? { day: k, signups: 0, active: 0, passed: 0 };
  });
}

/** A command to run in a terminal: shown in full, one click copies it. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(command).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };
  return (
    <div className="flex items-center gap-2 rounded-input bg-sunken py-1.5 pl-3 pr-1.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink-2">{command}</code>
      <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copy} aria-label="Copy command">{copied ? "Copied" : "Copy"}</Button>
    </div>
  );
}
