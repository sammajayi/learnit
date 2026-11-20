"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, BookOpen, Coins, ExternalLink, PiggyBank, Send } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { CELO_HELP_URL } from "@/lib/links";
import { LanguageCards } from "./LanguageCards";
import { ProfileEditor } from "./ProfileEditor";
import { Logo } from "./Logo";
import { Button, Notice } from "./ui";
import { cn } from "@/lib/cn";
import type { Course } from "@/lib/languages";

const HOW: { Icon: typeof Coins; title: string; body: string }[] = [
  { Icon: BookOpen, title: "Learn a little each day", body: "Short lessons. Pass at 80% to keep your streak and earn G$, the GoodDollar token." },
  { Icon: Coins, title: "Claim your daily G$", body: "Verified GoodDollar users can claim free G$ every day. This needs a quick face check." },
  { Icon: PiggyBank, title: "Stake to stay accountable", body: "Optional. Put G$ on a 7, 14 or 30 day challenge to keep yourself on track. Finish it and get your stake back." },
];

export function Onboarding() {
  const api = useApi();
  const qc = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reduce = useReducedMotion();

  async function finish() {
    if (!course) return;
    setBusy(true); setErr(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ course, timezone, onboarded: true }) });
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["today"] });
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not save your choices. Try again in a moment."); setBusy(false); }
  }

  const STEPS = ["Choose a language", "Set up your profile", "How LearnIt works"];
  const anim = reduce ? {} : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 }, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col px-5 pb-8 pt-6 sm:justify-center sm:pb-10 sm:pt-10">
      <Logo />
      <div className="mt-5 flex items-center gap-1.5" role="progressbar" aria-label="Setup progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
        {[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-sage-500" : "bg-line")} />)}
      </div>
      <p className="mt-6 text-eyebrow uppercase text-muted">Step {step + 1} of 3</p>

        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div key="s0" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-2 font-display text-[26px] leading-[1.1] tracking-[-0.03em] text-ink">What would you like to learn?</h1>
              <p className="mt-2.5 text-[15px] text-muted">Pick one to start. You can switch at any time and keep your progress.</p>
              <div className="mt-6"><LanguageCards value={course} onSelect={setCourse} /></div>
              <Button onClick={() => setStep(1)} disabled={!course} size="lg" variant="secondary" iconRight={ArrowRight} className="mt-6 self-end">Continue</Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-2 font-display text-[26px] leading-[1.1] tracking-[-0.03em] text-ink">Set up your profile</h1>
              <div className="mt-4"><ProfileEditor compact submitLabel="Save and continue" allowSkipSave onDone={() => setStep(2)} /></div>
              <div className="mt-3 flex items-center justify-between">
                <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setStep(0)} className="-ml-3">Back</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-2 font-display text-[26px] leading-[1.1] tracking-[-0.03em] text-ink">How LearnIt works</h1>
              <ul className="mt-6 grid gap-2">
                {HOW.map(({ Icon, title, body }) => (
                  <li key={title} className="flex items-start gap-3 rounded-input border border-line bg-surface px-3.5 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sage-50 text-sage-700"><Icon size={17} strokeWidth={1.85} aria-hidden /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{title}</span><span className="block text-pretty text-[13px] leading-snug text-muted">{body}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-pretty text-[13px] text-muted">Lessons are free for everyone.</p>
              <a href={CELO_HELP_URL} target="_blank" rel="noreferrer" className="group mt-3 flex items-center gap-3 rounded-input border border-sage-500 bg-sage-50 px-3.5 py-3 transition hover:bg-sage-100">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sage-700"><Send size={17} strokeWidth={1.85} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Join our Telegram group</span><span className="block text-pretty text-[13px] leading-snug text-ink-2">Get free CELO to stake and claim on the app.</span></span>
                <ExternalLink size={15} aria-hidden className="shrink-0 text-muted" />
              </a>
              {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)} disabled={busy} className="-ml-3">Back</Button>
                <Button onClick={finish} loading={busy} size="lg" iconRight={ArrowRight}>Start learning</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </main>
  );
}
