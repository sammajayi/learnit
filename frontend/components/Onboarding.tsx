"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Coins, ExternalLink, PiggyBank, Send } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { CELO_HELP_URL } from "@/lib/links";
import { LanguageCards } from "./LanguageCards";
import { ProfileEditor } from "./ProfileEditor";
import { Logo } from "./Logo";
import { Button, Notice } from "./ui";
import { cn } from "@/lib/cn";
import type { Course } from "@/lib/languages";

const HOW: { Icon: typeof Coins; title: string; body: string }[] = [
  { Icon: BookOpen, title: "Learn a little each day", body: "Pass at 80% to keep your streak and earn G$, the GoodDollar token." },
  { Icon: Coins, title: "Claim your daily G$", body: "Verified GoodDollar users can claim free G$ every day, then start a lesson." },
  { Icon: PiggyBank, title: "Stake on your streak", body: "Optional. Put G$ behind a 7, 14 or 30 day challenge. Finish and you get it back. Miss a day and you lose it." },
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
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[400px_1fr]">
      {/* Desktop: a calm navy panel with the steps. */}
      <aside className="grain relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sage-500/20 blur-3xl" />
        <Logo inverse />
        <ol className="relative grid gap-6">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-4">
              <span className={cn("grid h-8 w-8 place-items-center rounded-full text-sm font-semibold transition",
                i < step ? "bg-sage-500 text-white" : i === step ? "bg-white text-ink" : "border border-white/25 text-white/50")}>
                {i < step ? <Check size={15} strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-[15px] font-medium", i === step ? "text-white" : "text-white/55")}>{label}</span>
            </li>
          ))}
        </ol>
        {/* Said once the learner reaches the part that needs it, not on the first screen. */}
        {step > 0 ? <p className="relative max-w-[30ch] text-sm leading-relaxed text-white/55">Lessons are free for everyone. Claiming, earning and staking need a quick GoodDollar face check.</p> : <span />}
      </aside>

      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-8 pt-6 sm:px-8 lg:justify-center lg:py-16">
        {/* Mobile: logo and a slim step bar. */}
        <div className="lg:hidden">
          <Logo />
          <div className="mt-6 flex items-center gap-2" role="progressbar" aria-label="Setup progress" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
            {[0, 1, 2].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-sage-500" : "bg-line")} />)}
          </div>
        </div>
        <p className="mt-8 text-eyebrow uppercase text-muted lg:mt-0">Step {step + 1} of 3</p>

        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && (
            <motion.div key="s0" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-3 font-display text-display-lg text-ink">What would you like to learn?</h1>
              <p className="mt-3 text-[15px] text-muted">Pick one to start. You can switch at any time and keep your progress.</p>
              <div className="mt-8"><LanguageCards value={course} onSelect={setCourse} /></div>
              <Button onClick={() => setStep(1)} disabled={!course} size="lg" variant="secondary" iconRight={ArrowRight} className="mt-10 w-full sm:w-auto sm:self-end">Continue</Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-3 font-display text-display-lg text-ink">Set up your profile</h1>
              <p className="mt-3 text-[15px] text-muted">Choose a username. It shows on the leaderboard and in challenges. A photo is optional.</p>
              <div className="mt-8"><ProfileEditor submitLabel="Save and continue" allowSkipSave onDone={() => setStep(2)} /></div>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setStep(0)} className="-ml-3">Back</Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...anim} className="flex flex-1 flex-col">
              <h1 className="mt-3 font-display text-display-lg text-ink">How LearnIt works</h1>
              <ul className="mt-8 grid gap-3">
                {HOW.map(({ Icon, title, body }) => (
                  <li key={title} className="flex gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sage-50 text-sage-700"><Icon size={19} strokeWidth={1.85} aria-hidden /></span>
                    <span><span className="block font-semibold text-ink">{title}</span><span className="mt-0.5 block text-pretty text-sm leading-relaxed text-muted">{body}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-pretty text-sm text-muted">Lessons are free for everyone. Claiming, earning and staking need a quick GoodDollar face check.</p>
              <a href={CELO_HELP_URL} target="_blank" rel="noreferrer" className="group mt-5 flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card transition hover:border-line-strong">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sage-50 text-sage-700"><Send size={18} strokeWidth={1.85} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Join our Telegram group</span><span className="block text-pretty text-sm leading-relaxed text-muted">Optional. Get a little free CELO to cover network fees for claiming and staking, and meet other learners.</span></span>
                <ExternalLink size={15} aria-hidden className="shrink-0 text-muted transition group-hover:text-ink" />
              </a>
              {err && <Notice tone="danger" className="mt-4">{err}</Notice>}
              <div className="mt-auto flex flex-col-reverse gap-3 pt-8 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)} disabled={busy} className="sm:-ml-3">Back</Button>
                <Button onClick={finish} loading={busy} size="lg" iconRight={ArrowRight}>Start learning</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
