"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clock, Flame, Heart, HeartCrack, RotateCcw, Target, Volume2, VolumeX, X } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Button, ButtonLink, Card, Notice, ProgressRing } from "./ui";
import { ApiError, useApi } from "@/lib/useApi";
import { REGEN_MS } from "@learnit/backend/livesLogic";
import { Hearts, fmtWait, useSecondsUntil, type LivesInfo } from "./Lives";
import type { PublicExercise } from "@learnit/backend/lessons";
import { fmtGD } from "@learnit/backend/format";
import { LessonSkeleton } from "./Skeletons";
import { StakePrompt } from "./StakePrompt";
import { playCorrect, playTap, playWrong, soundEnabled, setSoundEnabled } from "@/lib/sounds";

type Loaded = { id: string; title: string; speechLang: string; token: string; lives?: LivesInfo; intro?: { target: string; english: string }[]; tip?: { title: string; body: string } | null; exercises: PublicExercise[] };
type Pair = { target: string; english: string };
type Ans = number | string[] | Pair[];
type Feedback = { correct: boolean; answer: unknown; lives?: LivesInfo };
type Result = { passed: boolean; rewardEligible: boolean; accuracy: number; durationS: number; missedWordIds: string[]; streak: number; attemptId: string; voucherPending: boolean; reviewPending: boolean };

import { preloadSpeech, speak } from "@/lib/speech";

const isCheckpoint = (id: string) => id.endsWith("-cp");

export function LessonPlayer({ id, onDone }: { id: string; onDone?: (r: Result) => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [first, setFirst] = useState<Record<string, Ans>>({});
  const [cur, setCur] = useState<Ans | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const missed = useRef<number[]>([]);
  const firstRef = useRef<Record<string, Ans>>({}); // mirrors `first` so submit never reads a stale value
  const [introSeen, setIntroSeen] = useState(false);
  const [round, setRound] = useState(1); // 2 and up: retrying missed exercises
  // Lives belong to the learner, not the lesson: the server keeps the count and tells us after each wrong answer. Checkpoints are exams and use none.
  const livesOn = !isCheckpoint(id);
  const [livesInfo, setLivesInfo] = useState<LivesInfo | null>(null);
  const lives = livesInfo?.lives ?? 0;
  /** Set when the last life goes: nothing can be played until the next one is back. */
  const [gate, setGate] = useState<LivesInfo | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [sound, setSound] = useState(true);
  useEffect(() => setSound(soundEnabled()), []);
  const base = isCheckpoint(id) ? `/api/checkpoints/${id}` : `/api/lessons/${id}`;

  useEffect(() => {
    api<Loaded>(base).then((d) => {
      setData(d); setQueue(d.exercises.map((_, i) => i)); setLivesInfo(livesOn ? d.lives ?? null : null);
      preloadSpeech([...(d.intro ?? []).map((w) => w.target), ...d.exercises.flatMap((e) => (e.type === "mc" && e.speak ? [e.speak] : []))], d.speechLang);
    }).catch((e) => {
      if (e instanceof ApiError && e.body.code === "no-lives") setGate(e.body.lives as LivesInfo);
      else setErr(e.message);
    });
  }, [api, base, livesOn, loadKey]);

  const ex = data && queue[pos] !== undefined ? data.exercises[queue[pos]] : null;
  useEffect(() => { if (ex?.type === "mc" && ex.speak && data && (introSeen || !data.intro?.length)) speak(ex.speak, data.speechLang); }, [ex, data, introSeen]);

  const record = useCallback((exId: string, answer: Ans) => {
    if (exId in firstRef.current) return;
    firstRef.current = { ...firstRef.current, [exId]: answer };
    setFirst(firstRef.current);
  }, []);

  const check = useCallback(async () => {
    if (!data || !ex || cur === null) return;
    playTap(); // inside the press, so the browser allows audio
    setBusy(true);
    try {
      // Plain fetch: this endpoint needs no login token, only the signed start token, so it skips the auth round trip.
      const res = await fetch(`/api/lessons/${data.id}/check`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: data.token, exerciseId: ex.id, answer: cur }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "We could not check that answer. Try again.");
      const r = (await res.json()) as Feedback;
      r.correct ? playCorrect() : playWrong();
      record(ex.id, cur);
      if (!r.correct && !missed.current.includes(queue[pos])) missed.current.push(queue[pos]);
      if (r.lives) { setLivesInfo(r.lives); void qc.invalidateQueries({ queryKey: ["today"] }); }
      setFb(r);
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not check that answer. Try again."); } finally { setBusy(false); }
  }, [data, ex, cur, queue, pos, record, qc]);

  const submit = useCallback(async (answers: Record<string, Ans>) => {
    if (!data) return;
    try {
      const r = await api<Result>(`${base}/submit`, { method: "POST", body: JSON.stringify({ token: data.token, answers }) });
      setResult(r); onDone?.(r);
      // Queries are cached for a minute, so without this the path, streak and points stay stale after a pass.
      for (const key of ["today", "me", "leaderboard", "cohorts", "vouchers"]) void qc.invalidateQueries({ queryKey: [key] });
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not submit your answers. Try again in a moment."); }
  }, [api, qc, data, base, onDone]);

  const next = useCallback(() => {
    if (!data) return;
    setFb(null); setCur(null);
    if (livesOn && livesInfo && livesInfo.lives <= 0) { setGate(livesInfo); return; }
    if (pos + 1 < queue.length) return setPos(pos + 1);
    // End of round: retry the exercises that were missed until all are right.
    const again = missed.current;
    missed.current = [];
    if (again.length) { setQueue(again); setPos(0); setRound((n) => n + 1); return; }
    void submit(firstRef.current);
  }, [data, pos, queue, submit, livesOn, livesInfo]);

  /** Match pairs are checked on the device, so finishing one needs no Check button and no network call. */
  const matchDone = useCallback((answer: Pair[], mistake: boolean) => {
    if (!ex) return;
    record(ex.id, answer);
    if (mistake && !missed.current.includes(queue[pos])) missed.current.push(queue[pos]);
    // A match is judged on the device, so tell the server. It costs one life however many pairs were wrong.
    if (mistake && livesOn) {
      const left = Math.max(0, lives - 1);
      setLivesInfo((p) => (p ? { ...p, lives: left } : p));
      const told = api<{ lives: LivesInfo }>("/api/lives/lose", { method: "POST", body: "{}" })
        .then((r) => { setLivesInfo(r.lives); void qc.invalidateQueries({ queryKey: ["today"] }); return r.lives; })
        .catch(() => null);
      if (left <= 0) { void told.then((l) => setGate(l ?? { lives: 0, max: livesInfo?.max ?? 5, nextAt: Date.now() + REGEN_MS })); return; }
    }
    next();
  }, [ex, record, queue, pos, next, livesOn, lives, livesInfo, api, qc]);

  /** A life is back: load the lesson again from the start. */
  const reset = useCallback(() => {
    firstRef.current = {}; missed.current = [];
    setFirst({}); setData(null); setQueue([]); setPos(0); setCur(null); setFb(null); setRound(1); setErr(null);
    setGate(null); setLoadKey((k) => k + 1);
  }, []);

  // Enter checks the answer, then continues. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (fb) { e.preventDefault(); next(); }
      else if (cur !== null && !busy && ex && ex.type !== "match") { e.preventDefault(); void check(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fb, cur, busy, ex, next, check]);

  if (gate) return <OutOfLives info={gate} onReady={reset} />;
  if (err && !data) return (
    <main className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-5">
      <Notice tone="danger" title="This lesson could not load" action={<ButtonLink href="/learn" variant="outline" size="sm">Back to your path</ButtonLink>}>{err}</Notice>
    </main>
  );
  if (!data) return <LessonSkeleton />;
  if (result) return <Results r={result} id={id} lives={livesOn ? livesInfo : null} />;
  if (data.intro?.length && !introSeen) return <Intro words={data.intro} tip={data.tip} lang={data.speechLang} title={data.title} lives={livesOn ? livesInfo : null} onStart={() => setIntroSeen(true)} />;
  if (!ex) return <LessonSkeleton label="Submitting your answers" />;

  const total = data.exercises.length;
  const done = Math.min(total, Object.keys(first).length);
  const retry = round > 1;
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <LessonTopBar title={data.title} done={done} total={total} lives={livesOn ? livesInfo : null} sound={sound} onSound={() => { const on = !sound; setSound(on); setSoundEnabled(on); if (on) playCorrect(); }} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-40 pt-8 sm:pt-14">
        <motion.section key={`${ex.id}-${pos}`} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <p className="flex items-center gap-2 text-eyebrow uppercase text-muted">
            {retry ? <><RotateCcw size={13} aria-hidden /> One more try</> : ex.type === "match" ? "Match the pairs" : ex.type === "translate" ? "Translate" : "Choose the answer"}
          </p>
          <h1 className="mt-3 text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[2rem]">{ex.type === "translate" ? "Translate this sentence" : ex.prompt}</h1>
          {ex.type === "mc" && ex.speak && (
            <button onClick={() => speak(ex.speak!, data.speechLang)} className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-surface py-2 pl-2 pr-4 text-[15px] font-medium text-ink shadow-card transition hover:border-ink/30">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sage-100 text-sage-700"><Volume2 size={16} aria-hidden /></span> Listen again
            </button>
          )}
          {ex.type === "translate" && (
            <Card className="mt-5 inline-flex px-5 py-4 text-lg font-medium text-ink-2 shadow-none">{ex.prompt}</Card>
          )}
          <div className="mt-8">
            {ex.type === "mc" && <Mc key={ex.id} ex={ex} onChange={setCur} locked={!!fb} result={fb} />}
            {ex.type === "translate" && <Translate key={ex.id} ex={ex} onChange={setCur} locked={!!fb} />}
            {ex.type === "match" && <Match key={ex.id} ex={ex} onFinish={matchDone} />}
          </div>
          {err && <Notice tone="danger" className="mt-6">{err}</Notice>}
        </motion.section>
      </main>

      {/* Bottom bar: the Check button, or the feedback panel once an answer is checked. */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <AnimatePresence mode="wait" initial={false}>
          {fb ? (
            <motion.div key="fb" role="status" initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className={cn("border-t pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5", fb.correct ? "border-sage-100 bg-sage-50" : "border-coral-100 bg-coral-50")}>
              <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-white", fb.correct ? "bg-sage-600" : "bg-coral-600")}>
                    {fb.correct ? <Check size={20} strokeWidth={3} aria-hidden /> : <X size={20} strokeWidth={3} aria-hidden />}
                  </span>
                  <div>
                    <p className={cn("text-lg font-semibold tracking-[-0.015em]", fb.correct ? "text-sage-700" : "text-coral-700")}>{fb.correct ? "Well done" : "Not quite"}</p>
                    {!fb.correct && <p className="mt-0.5 text-[15px] text-ink-2">Correct answer: <span className="font-semibold text-ink">{fmtAnswer(ex, fb.answer)}</span></p>}
                    {!fb.correct && livesOn && livesInfo && <p className="mt-0.5 text-sm font-medium text-coral-700">{lives === 0 ? "That was your last life." : `${lives} ${lives === 1 ? "life" : "lives"} left.`}</p>}
                  </div>
                </div>
                <Button onClick={next} size="lg" variant={fb.correct ? "secondary" : "primary"} iconRight={ArrowRight} className="sm:min-w-[180px]" autoFocus>Continue</Button>
              </div>
            </motion.div>
          ) : ex.type !== "match" ? (
            <motion.div key="check" initial={false} className="border-t border-line bg-surface/90 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-md">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5">
                <p className="hidden text-sm text-muted sm:block">{cur === null ? "Pick an answer to continue" : <>Press <kbd className="rounded border border-line-strong bg-canvas px-1.5 py-0.5 font-sans text-xs">Enter</kbd> to check</>}</p>
                <Button onClick={check} disabled={cur === null} loading={busy} size="lg" variant="secondary" className="max-sm:w-full sm:min-w-[180px]">Check answer</Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LessonTopBar({ title, done, total, lives, sound, onSound }: { title: string; done: number; total: number; lives: LivesInfo | null; sound: boolean; onSound: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-4 px-3 sm:px-5">
        <Link href="/learn" aria-label="Quit lesson" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:bg-sunken hover:text-ink"><X size={20} aria-hidden /></Link>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 truncate text-xs font-medium text-muted">{title}</p>
          <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Lesson progress" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full rounded-full bg-sage-500 transition-[width] duration-500 ease-soft" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
        <span className="tabular w-10 text-right text-sm font-medium text-muted">{done}/{total}</span>
        {lives && <Hearts lives={lives.lives} max={lives.max} />}
        <button onClick={onSound} aria-label={sound ? "Mute sounds" : "Turn sounds on"} aria-pressed={!sound} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:bg-sunken hover:text-ink">
          {sound ? <Volume2 size={19} aria-hidden /> : <VolumeX size={19} aria-hidden />}
        </button>
      </div>
    </header>
  );
}

function fmtAnswer(ex: PublicExercise, a: unknown): string {
  if (ex.type === "mc") return ex.options[a as number];
  if (ex.type === "translate") return (a as string[]).join(" ");
  return (a as Pair[]).map((p) => `${p.target} = ${p.english}`).join(", ");
}

const KEYS = ["A", "B", "C", "D", "E", "F"];

function Mc({ ex, onChange, locked, result }: { ex: Extract<PublicExercise, { type: "mc" }>; onChange: (a: Ans) => void; locked: boolean; result: Feedback | null }) {
  const [sel, setSel] = useState<number | null>(null);
  // Number keys 1 to 4 pick an option.
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key) - 1;
      if (Number.isInteger(n) && n >= 0 && n < ex.options.length) { setSel(n); onChange(n); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, ex.options.length, onChange]);
  return (
    <div role="radiogroup" aria-label="Answers" className="grid gap-3">
      {ex.options.map((o, i) => {
        const picked = sel === i;
        const right = !!result && result.answer === i;
        const wrong = !!result && picked && !result.correct;
        return (
          <button key={i} role="radio" aria-checked={picked} disabled={locked} onClick={() => { setSel(i); onChange(i); }}
            className={cn("group flex items-center gap-4 rounded-card border bg-surface px-4 py-4 text-left text-[17px] font-medium text-ink shadow-card transition duration-150 ease-soft",
              !locked && "hover:border-ink/30 hover:shadow-raised active:scale-[0.995]",
              picked && !result && "border-ink ring-4 ring-ink/5",
              right && "border-sage-500 bg-sage-50 text-sage-700",
              wrong && "border-coral-300 bg-coral-50 text-coral-700",
              !picked && !right && "border-line", locked && !right && !wrong && "opacity-60")}>
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-semibold transition",
              picked && !result ? "border-ink bg-ink text-white" : right ? "border-sage-600 bg-sage-600 text-white" : wrong ? "border-coral-600 bg-coral-600 text-white" : "border-line-strong text-muted group-hover:border-ink/30")}>
              {right ? <Check size={15} strokeWidth={3} aria-hidden /> : wrong ? <X size={15} strokeWidth={3} aria-hidden /> : KEYS[i]}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Translate({ ex, onChange, locked }: { ex: Extract<PublicExercise, { type: "translate" }>; onChange: (a: Ans) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number[]>([]);
  const set = (p: number[]) => { setPicked(p); if (p.length) onChange(p.map((i) => ex.bank[i])); };
  const chip = "rounded-input border px-4 py-2.5 text-[16px] font-medium shadow-card transition duration-150 ease-soft";
  return (
    <div>
      <div className="flex min-h-[76px] flex-wrap content-start gap-2 rounded-card border border-dashed border-line-strong bg-surface/60 p-3" aria-label="Your answer">
        {picked.length === 0 && <p className="px-1 py-2 text-sm text-muted">Tap the words below in order</p>}
        {picked.map((i, k) => (
          <motion.button layout key={`${i}-${k}`} disabled={locked} onClick={() => set(picked.filter((_, j) => j !== k))} className={cn(chip, "border-ink/20 bg-surface text-ink hover:border-ink/40")}>{ex.bank[i]}</motion.button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {ex.bank.map((w, i) => {
          const used = picked.includes(i);
          return (
            <button key={i} disabled={locked || used} onClick={() => set([...picked, i])}
              className={cn(chip, used ? "border-transparent bg-sunken text-transparent shadow-none" : "border-line bg-surface text-ink hover:-translate-y-px hover:border-ink/30")}>{w}</button>
          );
        })}
      </div>
    </div>
  );
}

function Match({ ex, onFinish }: { ex: Extract<PublicExercise, { type: "match" }>; onFinish: (answer: Pair[], mistake: boolean) => void }) {
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const firstChoice = useRef<Record<string, string>>({});
  const mistake = useRef(false);
  const truth = useMemo(() => Object.fromEntries(ex.pairs.map((p) => [p.target, p.english])), [ex]);
  const doneRight = useMemo(() => new Set(matched.map((l) => truth[l])), [matched, truth]);

  function pickRight(r: string) {
    if (!left) return;
    if (!(left in firstChoice.current)) firstChoice.current[left] = r; // only the first try counts towards accuracy
    if (truth[left] === r) {
      playCorrect();
      const m = [...matched, left];
      setMatched(m); setLeft(null);
      if (m.length === ex.left.length) setTimeout(() => onFinish(ex.left.map((t) => ({ target: t, english: firstChoice.current[t] })), mistake.current), 450);
    } else {
      mistake.current = true;
      playWrong();
      setWrong(r); setLeft(null);
      setTimeout(() => setWrong(null), 450);
    }
  }
  const tile = "min-h-[56px] rounded-card border bg-surface px-4 py-3 text-[16px] font-medium shadow-card transition duration-150 ease-soft";
  return (
    <div>
      <p className="mb-4 text-sm text-muted">Pick a word on the left, then its meaning on the right.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {ex.left.map((l) => {
            const ok = matched.includes(l);
            return <button key={l} disabled={ok} onClick={() => setLeft(l)} aria-pressed={left === l}
              className={cn(tile, ok ? "border-sage-100 bg-sage-50 text-sage-700 shadow-none" : left === l ? "border-ink text-ink ring-4 ring-ink/5" : "border-line text-ink hover:border-ink/30")}>{l}</button>;
          })}
        </div>
        <div className="grid gap-3">
          {ex.right.map((r) => {
            const ok = doneRight.has(r);
            return <button key={r} disabled={ok || !left} onClick={() => pickRight(r)}
              className={cn(tile, ok ? "border-sage-100 bg-sage-50 text-sage-700 shadow-none" : wrong === r ? "border-coral-300 bg-coral-50 text-coral-700" : "border-line text-ink enabled:hover:border-ink/30 disabled:text-ink-2")}>{r}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function Results({ r, id, lives }: { r: Result; id: string; lives: LivesInfo | null }) {
  const api = useApi();
  const reduce = useReducedMotion();
  const [voucher, setVoucher] = useState<{ amount: string } | null>(null);
  const [pending, setPending] = useState(r.voucherPending);
  const [review, setReview] = useState(r.reviewPending);
  useEffect(() => {
    if (!r.voucherPending) return;
    let dead = false;
    api<{ voucher: { amount: string } | null; reviewPending: boolean }>("/api/vouchers/issue", { method: "POST", body: JSON.stringify({ attemptId: r.attemptId }) })
      .then((x) => { if (!dead) { setVoucher(x.voucher); setReview(x.reviewPending); } })
      .catch(() => {})
      .finally(() => { if (!dead) setPending(false); });
    return () => { dead = true; };
  }, [api, r]);
  const pct = Math.round(r.accuracy * 100);
  const mins = Math.floor(r.durationS / 60), secs = Math.round(r.durationS % 60);
  const title = r.passed ? (isCheckpoint(id) ? "Checkpoint cleared" : "Lesson complete") : "Almost there";
  const body = r.passed
    ? `Your streak is now ${r.streak} day${r.streak === 1 ? "" : "s"}. Well done.`
    : "So close. Pass at 80% to clear this checkpoint. Have another go and the words you missed will come up first.";
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-12">
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="overflow-hidden text-center">
          <div className={cn("px-6 pb-8 pt-10", r.passed ? "bg-sage-50" : "bg-canvas")}>
            <ProgressRing value={r.accuracy} size={120} stroke={8} tone={r.passed ? "sage" : "coral"} label={`${pct}% accuracy`}>
              <span className="tabular text-3xl font-semibold tracking-[-0.03em] text-ink">{pct}<span className="text-lg text-muted">%</span></span>
            </ProgressRing>
            <p className="mt-6 text-eyebrow uppercase text-muted">{isCheckpoint(id) ? "Checkpoint" : "Lesson"} result</p>
            <h1 className="mt-2 text-display-md text-ink">{title}</h1>
            <p className="mx-auto mt-2 max-w-[36ch] text-pretty leading-relaxed text-ink-2">{body}</p>
          </div>
          <dl className={`grid divide-x divide-line border-y border-line ${lives ? "grid-cols-4" : "grid-cols-3"}`}>
            {[
              { Icon: Target, k: "Accuracy", v: `${pct}%` },
              { Icon: Clock, k: "Time", v: mins ? `${mins}m ${secs}s` : `${secs}s` },
              { Icon: Flame, k: "Streak", v: `${r.streak}` },
              ...(lives ? [{ Icon: Heart, k: "Lives", v: `${lives.lives}/${lives.max}` }] : []),
            ].map(({ Icon, k, v }) => (
              <div key={k} className="px-3 py-4">
                <dt className="flex items-center justify-center gap-1 text-xs font-medium text-muted"><Icon size={13} aria-hidden />{k}</dt>
                <dd className="tabular mt-1 text-lg font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-3 p-6">
            {pending && <div className="flex items-center justify-center gap-2 rounded-input bg-sunken px-4 py-3 text-sm text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" /> Working out your reward…</div>}
            {voucher && (
              <ButtonLink href="/earn" variant="subtle" size="lg" block className="justify-between px-5">
                <span className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-sage-600 text-[10px] font-semibold text-white">G$</span>You earned {fmtGD(voucher.amount)} G$</span>
                <span className="flex items-center gap-1 text-sm">Claim <ArrowRight size={15} aria-hidden /></span>
              </ButtonLink>
            )}
            {r.passed && !review && <StakePrompt />}
            {r.passed && !isCheckpoint(id) && !r.rewardEligible && <Notice tone="info">You scored {pct}%. G$ rewards need 80% or more. Your points still count, and they rise with accuracy.</Notice>}
            {r.passed && !pending && !voucher && review && <Notice tone="info">Your reward is being reviewed. It will show up in Rewards once that clears.</Notice>}
            <ButtonLink href="/learn" size="lg" block variant={voucher ? "secondary" : "primary"} iconRight={ArrowRight}>{r.passed ? "Continue" : "Back to your path"}</ButtonLink>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}

/** Shown before the questions so a complete beginner meets each word, and hears it, before being asked about it. */
function Intro({ words, tip, lang, title, lives, onStart }: { words: { target: string; english: string }[]; tip?: { title: string; body: string } | null; lang: string; title: string; lives: LivesInfo | null; onStart: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-3 sm:px-5">
          <Link href="/learn" aria-label="Quit lesson" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:bg-sunken hover:text-ink"><X size={20} aria-hidden /></Link>
          <p className="truncate text-sm font-medium text-ink-2">{title}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-36 pt-10 sm:pt-14">
        <p className="text-eyebrow uppercase text-sage-700">New words</p>
        <h1 className="mt-3 text-display-md text-ink sm:text-[2rem]">Meet the words first</h1>
        <p className="mt-2 text-[15px] text-muted">Tap a word to hear it. Then you will practise them.{lives && ` You have ${lives.lives} of ${lives.max} lives, shared across lessons. A wrong answer costs one, and one comes back every 30 minutes.`}</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {words.map((w, i) => (
            <motion.li key={w.target} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
              <button onClick={() => speak(w.target, lang)} className="group flex w-full items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 text-left shadow-card transition duration-150 ease-soft hover:border-ink/25 hover:shadow-raised">
                <span><span lang={lang} className="block text-xl font-semibold tracking-[-0.015em] text-ink">{w.target}</span><span className="mt-0.5 block text-[15px] text-muted">{w.english}</span></span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700 transition group-hover:bg-sage-100"><Volume2 size={18} aria-hidden /></span>
              </button>
            </motion.li>
          ))}
        </ul>
        {tip && (
          <section aria-labelledby="grammar-tip" className="mt-8 rounded-card border border-line bg-sage-50 p-5">
            <p className="text-eyebrow uppercase text-sage-700">Grammar tip</p>
            <h2 id="grammar-tip" className="mt-2 text-lg font-semibold tracking-[-0.01em] text-ink">{tip.title}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{tip.body}</p>
          </section>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/90 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5">
          <p className="hidden text-sm text-muted sm:block">{words.length} new word{words.length === 1 ? "" : "s"}</p>
          <Button onClick={onStart} size="lg" variant="secondary" iconRight={ArrowRight} className="max-sm:w-full sm:min-w-[180px]">Start practice</Button>
        </div>
      </div>
    </div>
  );
}

/** Shown when the last life goes, or when a lesson is opened with none. Lessons wait until the next one is back. */
function OutOfLives({ info, onReady }: { info: LivesInfo; onReady: () => void }) {
  const reduce = useReducedMotion();
  const left = useSecondsUntil(info.nextAt);
  const ready = left <= 0;
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-5 py-12">
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="overflow-hidden text-center">
          <div className="bg-canvas px-6 pb-8 pt-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunken text-ink-2"><HeartCrack size={30} strokeWidth={1.75} aria-hidden /></span>
            <p className="mt-6 text-eyebrow uppercase text-muted">Lessons paused</p>
            <h1 className="mt-2 text-display-md text-ink">You are out of lives</h1>
            <p className="mx-auto mt-2 max-w-[38ch] text-pretty leading-relaxed text-ink-2">
              {ready ? "A life is back. Pick up where you left off." : `Lives are shared by every lesson, and one comes back every 30 minutes. Your progress and streak are safe.`}
            </p>
          </div>
          <div className="grid gap-3 p-6">
            <Button onClick={onReady} size="lg" block icon={ready ? RotateCcw : undefined} disabled={!ready} autoFocus={ready}>{ready ? "Start this lesson" : `Next life in ${fmtWait(left)}`}</Button>
            <ButtonLink href="/learn" size="lg" block variant="outline">Back to your path</ButtonLink>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}
