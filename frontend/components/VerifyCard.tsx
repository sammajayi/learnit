"use client";
import { useState } from "react";
import { ScanFace } from "@/lib/icons";
import { useGoodSdk } from "@/lib/useGoodSdk";
import { CHAIN_ID } from "@learnit/backend/chain";
import { Button, Card } from "./ui";

export function VerifyCard() {
  const sdk = useGoodSdk();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!sdk) return;
    setBusy(true); setErr(null);
    try {
      const link = await sdk.identity.generateFVLink(false, `${window.location.origin}/?fv=1`, CHAIN_ID as never);
      window.location.href = link;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not open GoodDollar verification. Try again in a moment.");
      setBusy(false);
    }
  }
  return (
    <Card className="overflow-hidden">
      <div className="bg-sage-50 px-6 pb-5 pt-6">
        <span className="grid h-11 w-11 place-items-center rounded-input bg-surface text-sage-700 shadow-card ring-1 ring-sage-100"><ScanFace size={22} strokeWidth={1.75} aria-hidden /></span>
        <h2 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-ink">Verify to claim and earn</h2>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-2">A quick GoodDollar face check proves you&apos;re one person. You need it to claim daily G$, earn lesson rewards and stake.</p>
      </div>
      <div className="p-6 pt-5">
        <Button onClick={go} loading={busy} disabled={!sdk} block>{busy ? "Opening GoodDollar…" : "Verify with GoodDollar"}</Button>
        <p className="mt-3 text-center text-xs text-muted">Lessons stay free either way.</p>
        {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}
      </div>
    </Card>
  );
}
