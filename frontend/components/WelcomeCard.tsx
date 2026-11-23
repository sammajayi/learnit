"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "@/components/icons";
import { fmtGD } from "@learnit/backend/format";
import { useApi } from "@/lib/useApi";
import { Button, Card } from "./ui";

type Status = { eligible: boolean; why: string | null; amount: string };

/** The one-time welcome G$ for a new learner who has verified and passed a lesson. Hidden for everyone else. */
export function WelcomeCard() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["welcome"], queryFn: () => api<Status>("/api/welcome"), retry: false, staleTime: 60_000 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!data?.eligible) return null;

  async function claim() {
    setBusy(true); setErr(null);
    try {
      await api("/api/welcome", { method: "POST" });
      await Promise.all([qc.invalidateQueries({ queryKey: ["welcome"] }), qc.invalidateQueries({ queryKey: ["vouchers"] })]);
      router.push("/earn"); // the voucher is waiting there to claim
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We could not get your welcome G$ ready. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Gift size={18} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Your welcome G$ is ready</h2>
          <p className="text-sm text-muted">{fmtGD(data.amount)} G$, one time only.</p>
        </div>
        <Button size="sm" loading={busy} onClick={claim}>Get it</Button>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
    </Card>
  );
}
