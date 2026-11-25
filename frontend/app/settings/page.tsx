"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { BadgeCheck, Check, ChevronRight, ExternalLink, UserRound, Wallet, Languages, ScanFace } from "@/components/icons";
import { useMe } from "@/lib/useMe";
import { short } from "@learnit/backend/format";
import { AppShell } from "@/components/AppShell";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { ReminderRow } from "@/components/ReminderCard";
import { Sk } from "@/components/Skeletons";
import { useAuthGate } from "@/components/useAuthGate";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

const rowClass = "flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition-colors duration-100 hover:bg-canvas active:bg-sunken focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ink/15";

function IconBox({ children }: { children: ReactNode }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2">{children}</span>;
}

/** One row, one tap. It is a button, a link or an external link, and shows its value or a stamp on the right. */
function Row({ icon, label, value, onClick, href, external }: { icon: ReactNode; label: string; value?: ReactNode; onClick?: () => void; href?: string; external?: boolean }) {
  const inner = (
    <>
      <IconBox>{icon}</IconBox>
      <span className="min-w-0 flex-1 font-medium text-ink">{label}</span>
      {value && <span className="shrink-0 text-muted">{value}</span>}
      {(onClick || href) && (external ? <ExternalLink size={16} aria-hidden className="shrink-0 text-muted" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-muted" />)}
    </>
  );
  if (href && external) return <a href={href} target="_blank" rel="noreferrer" className={rowClass}>{inner}</a>;
  if (href) return <Link href={href} className={rowClass}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={rowClass}>{inner}</button>;
  return <div className={cn(rowClass, "hover:bg-transparent active:bg-transparent")}>{inner}</div>;
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 text-sm font-semibold text-muted">{title}</h2>
      <Card className="divide-y divide-line overflow-hidden">{children}</Card>
    </section>
  );
}

/** Settings as a plain grouped list. Each thing is on one row, and one tap changes it. The wallet appears here and nowhere else. */
export default function Settings() {
  const ok = useAuthGate();
  const { logout } = useAuth();
  const { data: me } = useMe();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  if (!ok || !me) {
    return (
      <AppShell width="narrow">
        <div className="grid gap-6" aria-hidden><Sk className="h-8 w-40 rounded-lg" /><Sk className="h-48 w-full rounded-card" /><Sk className="h-20 w-full rounded-card" /></div>
      </AppShell>
    );
  }

  async function copy() {
    try { await navigator.clipboard.writeText(me!.wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the address is on screen, so it can be copied by hand */ }
  }

  return (
    <AppShell width="narrow">
      <div className="grid gap-6">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Settings</h1>

        <Group id="account" title="Account">
          <Row icon={<UserRound size={18} strokeWidth={1.85} aria-hidden />} label="Username" value={me.username ? `@${me.username}` : "Add"} onClick={() => setEditing(true)} />
          <Row icon={<Wallet size={18} strokeWidth={1.85} aria-hidden />} label={copied ? "Copied" : "Copy address"} value={<span className="font-mono text-[13px]">{short(me.wallet)}</span>} onClick={copy} />
          <Row icon={<Languages size={18} strokeWidth={1.85} aria-hidden />} label="Language" href="/language" />
        </Group>

        <Group id="preferences" title="Preferences">
          <ReminderRow />
        </Group>

        <Group id="identity" title="Identity">
          {me.verified
            ? <Row icon={<BadgeCheck size={18} strokeWidth={1.85} aria-hidden />} label="GoodDollar" value={<Badge tone="sage" icon={Check}>Verified</Badge>} />
            : <Row icon={<ScanFace size={18} strokeWidth={1.85} aria-hidden />} label="Verify with GoodDollar" href="/home" />}
        </Group>

        <div>
          <button type="button" onClick={() => void logout()}
            className="rounded text-sm font-medium text-muted underline-offset-4 transition-colors duration-100 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">Sign out</button>
        </div>
      </div>
      <EditProfileSheet open={editing} onClose={() => setEditing(false)} />
    </AppShell>
  );
}
