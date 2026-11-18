"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { AppShell } from "@/components/AppShell";
import { LanguageCards } from "@/components/LanguageCards";
import { useAuthGate } from "@/components/useAuthGate";
import { LanguageSkeleton } from "@/components/Skeletons";
import { Button, Notice, PageHeader } from "@/components/ui";
import type { Course } from "@/lib/languages";

export default function ChangeLanguage() {
  const ok = useAuthGate();
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(course: Course) {
    if (course === me?.course) return router.back();
    setBusy(true); setErr(null);
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ course }) });
      await Promise.all([qc.invalidateQueries({ queryKey: ["me"] }), qc.invalidateQueries({ queryKey: ["today"] })]);
      router.push("/learn");
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not switch language. Try again in a moment."); setBusy(false); }
  }

  if (!ok || !me) return <LanguageSkeleton />;
  return (
    <AppShell width="narrow">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.back()} className="-ml-3 mb-4">Back</Button>
      <PageHeader title="Change language" description="Your progress in each language is kept, so you can switch back any time." />
      <div className="mt-8"><LanguageCards value={me?.course ?? null} onSelect={pick} disabled={busy || !me} /></div>
      {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
    </AppShell>
  );
}
