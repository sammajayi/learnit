"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/lib/useAuth";
import { ArrowRight, BadgeCheck, BookOpen, Check, Coins, Flame, Lock, Mail, ScanFace, ShieldCheck, Sparkles, PiggyBank, Volume2, Wallet, X } from "lucide-react";
import { LANGS } from "@/lib/languages";
import { Badge, Button, Card } from "./ui";
import { Logo } from "./Logo";
import { Flag } from "./Flag";

// Loaded after first paint so the page is interactive before WebGL starts.
const Globe = dynamic(() => import("./Globe"), { ssr: false, loading: () => <div className="aspect-square w-full rounded-full bg-sunken" aria-hidden /> });

const ease = [0.22, 1, 0.36, 1] as const;

/** The public landing page. The hero and the closing section offer email and wallet side by side; every other call to action opens a short chooser. */
export function LoginScreen() {
  const { login } = useAuth();
  // Sessions are per-origin, so on the public site (apex) sign-in hands off to the app subdomain.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const handOff = (kind: "email" | "wallet") => {
    if (!appUrl || window.location.origin === new URL(appUrl).origin) return false;
    if (window.location.hostname.startsWith("localhost") || window.location.hostname.endsWith(".vercel.app")) return false;
    // Say which button was pressed, so the app opens that sign-in straight away and the visitor does not have to press it twice.
    const to = new URL(appUrl);
    to.searchParams.set("login", kind);
    window.location.href = to.toString();
    return true;
  };
  const email = () => { if (!handOff("email")) login({ loginMethods: ["email"] }); };
  const wallet = () => { if (!handOff("wallet")) login({ loginMethods: ["wallet"] }); };
  const [choosing, setChoosing] = useState(false);
  const choose = () => setChoosing(true);

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <ChooseSignIn open={choosing} onClose={() => setChoosing(false)} onEmail={() => { setChoosing(false); email(); }} onWallet={() => { setChoosing(false); wallet(); }} />
      <SiteNav onSignIn={choose} />
      <Hero onEmail={email} onWallet={wallet} />
      <HowItWorks />
      <Languages onStart={choose} />
      <Rewards />
      <Faq />
      <FinalCta onEmail={email} onWallet={wallet} />
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-app flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>Lessons are free. Rewards are paid in G$ on Celo.</p>
        </div>
      </footer>
    </div>
  );
}

/** Asks how to sign in before any form opens: email, or a wallet they already have. */
function ChooseSignIn({ open, onClose, onEmail, onWallet }: { open: boolean; onClose: () => void; onEmail: () => void; onWallet: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-labelledby="choose-title"
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-card border border-line bg-surface p-6 text-ink shadow-float backdrop:bg-ink/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="choose-title" className="font-display text-2xl font-semibold tracking-[-0.02em]">Get started</h2>
          <p className="mt-1 text-sm text-muted">Choose how to sign in.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="mt-5 grid gap-3">
        <Button size="lg" icon={Mail} block onClick={onEmail}>Continue with email</Button>
        <Button size="lg" variant="outline" icon={Wallet} block onClick={onWallet}>Connect a wallet</Button>
      </div>
      <p className="mt-4 text-center text-xs text-muted">No wallet? Email creates one for you.</p>
    </dialog>
  );
}

function SiteNav({ onSignIn }: { onSignIn: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-canvas/80 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex h-16 max-w-app items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-8 text-sm font-medium text-ink-2 md:flex">
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <a href="#languages" className="transition hover:text-ink">Languages</a>
          <a href="#rewards" className="transition hover:text-ink">Rewards</a>
          <a href="#faq" className="transition hover:text-ink">FAQ</a>
        </nav>
        <Button size="sm" onClick={onSignIn}>Get started</Button>
      </div>
    </header>
  );
}

function Hero({ onEmail, onWallet }: { onEmail: () => void; onWallet: () => void }) {
  const reduce = useReducedMotion();
  const rise = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease } });
  return (
    <section className="relative overflow-hidden">
      {/* Two soft washes of colour behind the hero, nothing louder. */}
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-sage-100/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-32 top-64 h-[360px] w-[360px] rounded-full bg-coral-50 blur-3xl" />

      <div className="relative mx-auto grid max-w-app items-center gap-14 px-5 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div>
          <motion.div {...rise(0)}>
            <Badge tone="outline" className="bg-surface/70 py-1 pl-1.5 pr-3 text-[13px]">
              <span className="flex -space-x-0.5">{LANGS.map((l) => <Flag key={l.code} code={l.code} size={18} className="ring-2 ring-surface" />)}</span>
              French and Spanish, from zero
            </Badge>
          </motion.div>
          <motion.h1 {...rise(0.05)} className="mt-6 max-w-[14ch] text-balance font-display text-display-xl text-ink">
            Learn a language. <span className="text-sage-700">Earn as you go.</span>
          </motion.h1>
          <motion.p {...rise(0.12)} className="mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-ink-2">
            Ten calm minutes a day of French or Spanish. Pass a lesson, keep your streak, and earn small GoodDollar (G$) rewards that you claim to your wallet.
          </motion.p>
          <motion.div {...rise(0.18)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" icon={Mail} onClick={onEmail}>Start with email</Button>
            <Button size="lg" variant="outline" icon={Wallet} onClick={onWallet}>Connect a wallet</Button>
          </motion.div>
          <motion.ul {...rise(0.24)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {["Lessons are free", "No wallet needed to start", "Rewards on Celo"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check size={15} strokeWidth={2.5} className="text-sage-600" aria-hidden />{t}</li>
            ))}
          </motion.ul>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/** A still of the real lesson screen, built from the same components, not a stock image. */
function HeroPreview() {
  const reduce = useReducedMotion();
  return (
    <motion.div aria-hidden initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15, ease }}
      className="relative mx-auto w-full max-w-[460px] lg:mr-0">
      <Card className="relative overflow-hidden p-6 shadow-float sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-sunken text-muted"><span className="text-lg leading-none">&times;</span></span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"><div className="h-full w-[62%] rounded-full bg-sage-500" /></div>
          <span className="text-xs font-medium text-muted tabular">5/8</span>
        </div>
        <p className="mt-7 text-eyebrow uppercase text-muted">Unit 1 · Greetings</p>
        <p className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink">What does this mean?</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-sm font-medium text-ink-2">
          <Volume2 size={15} /> <span lang="fr">Bonjour, ça va&nbsp;?</span>
        </div>
        <div className="mt-6 grid gap-2.5">
          {["Good night, see you soon", "Hello, how are you?", "Thank you very much"].map((o, i) => (
            <div key={o} className={`flex items-center justify-between rounded-input border px-4 py-3.5 text-[15px] font-medium ${i === 1 ? "border-sage-500 bg-sage-50 text-sage-700" : "border-line bg-surface text-ink-2"}`}>
              {o}
              {i === 1 && <span className="grid h-5 w-5 place-items-center rounded-full bg-sage-600 text-white"><Check size={12} strokeWidth={3} /></span>}
            </div>
          ))}
        </div>
        <div className="mt-6 grid h-12 place-items-center rounded-btn bg-ink text-[15px] font-semibold text-white">Continue</div>
      </Card>

      <Card className="absolute -left-4 -top-7 hidden items-center gap-2 px-4 py-3 shadow-raised sm:flex md:-left-10">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-50 text-coral-600"><Flame size={18} /></span>
        <span className="text-lg font-semibold text-ink tabular"><span className="sr-only">Streak: </span>12</span>
      </Card>
      <Card className="absolute -bottom-5 -right-3 flex items-center gap-3 px-4 py-3 shadow-raised md:-right-8">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">G$</span>
        <span><span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Lesson passed</span><span className="block text-sm font-semibold text-ink">Reward ready to claim</span></span>
      </Card>
    </motion.div>
  );
}

function SectionIntro({ eyebrow, title, body, center = false, inverse = false }: { eyebrow: string; title: string; body?: string; center?: boolean; inverse?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-eyebrow uppercase ${inverse ? "text-sage-300" : "text-sage-700"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-balance text-display-lg ${inverse ? "text-white" : "text-ink"}`}>{title}</h2>
      {body && <p className={`mt-4 text-pretty text-lg leading-relaxed ${inverse ? "text-white/70" : "text-ink-2"}`}>{body}</p>}
    </div>
  );
}

const STEPS = [
  { Icon: BookOpen, title: "Learn for ten minutes", body: "Short lessons that start from zero. Meet new words, hear them spoken, then practise until they stick." },
  { Icon: Flame, title: "Show up each day", body: "Finish a lesson to keep your streak. Miss a day? A streak freeze can cover you." },
  { Icon: Coins, title: "Earn G$ for progress", body: "Passed lessons and unit checkpoints earn GoodDollar. Claim it to your wallet within 7 days." },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-app px-5 py-20 sm:px-8 lg:py-28">
        <SectionIntro eyebrow="How it works" title="A daily habit, rewarded." body="LearnIt is built around one small, steady session a day. Rewards follow the learning, never the other way round." />
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title}>
              <Card className="h-full bg-canvas/60 p-7 shadow-none">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-input bg-surface text-ink shadow-card ring-1 ring-line"><Icon size={20} strokeWidth={1.85} aria-hidden /></span>
                  <span className="text-sm font-medium text-muted tabular">0{i + 1}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-[-0.015em] text-ink">{title}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-ink-2">{body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Languages({ onStart }: { onStart: () => void }) {
  return (
    <section id="languages" className="scroll-mt-20">
      <div className="mx-auto grid max-w-app items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-28">
        <div>
          <SectionIntro eyebrow="Courses" title="Two languages, spoken by hundreds of millions." body="Each course takes you through 10 units, from your first hello to everyday conversation, with a checkpoint at the end of every unit." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {LANGS.map((l) => (
              <Card key={l.code} interactive className="group p-6">
                <div className="flex items-center justify-between">
                  <Flag code={l.code} size={40} />
                  <Badge tone="sage">A0 to A2 · 10 units</Badge>
                </div>
                <p lang={l.code} className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-ink">{l.native}</p>
                <p className="text-sm text-muted">{l.english}</p>
                <p className="mt-4 text-pretty text-sm leading-relaxed text-ink-2">{l.blurb}</p>
                <button onClick={onStart} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition group-hover:gap-2.5">
                  Start learning {l.english} <ArrowRight size={15} aria-hidden />
                </button>
              </Card>
            ))}
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <div aria-hidden className="absolute inset-[8%] rounded-full bg-sage-100/60 blur-2xl" />
          <div className="relative"><Globe /></div>
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  { Icon: ScanFace, title: "One person, one account", body: "Rewards need a quick GoodDollar face check, so they go to real learners and not bots. Lessons stay free either way." },
  { Icon: ShieldCheck, title: "Paid on-chain, on Celo", body: "Rewards are signed vouchers you claim from the LearnIt rewards pool contract. Every claim is a transaction anyone can look up." },
  { Icon: PiggyBank, title: "Stake to stay committed", body: "Optional. Put G$ behind a 7, 14 or 30 day challenge. Finish a lesson every day to get your stake back. Miss a day and it is shared with the people who finished." },
  { Icon: Lock, title: "Fair by design", body: "A daily limit on rewards, a minimum time per lesson and contracts that can be paused if anything looks wrong." },
];

function Rewards() {
  return (
    <section id="rewards" className="scroll-mt-20 px-3 sm:px-5">
      <div className="grain mx-auto max-w-[84rem] overflow-hidden rounded-[28px] bg-ink text-white">
        <div className="mx-auto max-w-app px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            <div>
              <SectionIntro inverse eyebrow="Rewards" title="Rewards you can trust and verify." body="GoodDollar (G$) is a universal basic income token. LearnIt adds a second way to earn it: by learning." />
              <div className="mt-10 rounded-card bg-white/[0.06] p-6 ring-1 ring-inset ring-white/10">
                <p className="text-eyebrow uppercase text-white/60">Every day in LearnIt</p>
                <ul className="mt-4 grid gap-3 text-[15px] text-white/85">
                  {["Pass a lesson to earn a G$ reward", "Claim your daily GoodDollar UBI", "Clear a unit checkpoint for a bigger one", "Top 3 on the weekly leaderboard share a bonus"].map((t) => (
                    <li key={t} className="flex gap-3"><Sparkles size={17} className="mt-0.5 shrink-0 text-coral-300" aria-hidden />{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-card bg-white/10 sm:grid-cols-2">
              {TRUST.map(({ Icon, title, body }) => (
                <li key={title} className="bg-ink p-7">
                  <Icon size={22} strokeWidth={1.75} className="text-sage-300" aria-hidden />
                  <h3 className="mt-5 font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-white/65">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  { q: "Do I need a crypto wallet?", a: "No. Sign in with email and LearnIt creates a wallet for you. If you already use GoodDollar, connect that wallet instead." },
  { q: "Is it really free?", a: "Every lesson is free. Claiming rewards and staking need a one-time GoodDollar face check, and a little CELO for network fees, which you can get free in our Telegram group. Staking also uses your own G$." },
  { q: "How much can I earn?", a: "Each passed lesson and checkpoint earns a set G$ reward. A daily limit applies, and the amounts are shown in the app before you claim." },
  { q: "What happens if I miss a day while staking?", a: "You lose that stake: it is shared with the people who finished. Staking is optional, and learning and rewards work without it." },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto grid max-w-app gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <SectionIntro eyebrow="Questions" title="Good to know before you start." />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md text-[17px] font-semibold tracking-[-0.01em] text-ink">
                <h3>{q}</h3>
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-[60ch] text-pretty leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ onEmail, onWallet }: { onEmail: () => void; onWallet: () => void }) {
  return (
    <section className="px-5 pb-20 sm:px-8 lg:pb-28">
      <Card className="mx-auto flex max-w-app flex-col items-start gap-8 overflow-hidden bg-sage-50 p-8 shadow-none ring-1 ring-sage-100 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-sage-700"><BadgeCheck size={16} aria-hidden /> Free to start, today</p>
          <h2 className="mt-3 max-w-[22ch] text-balance text-display-lg text-ink">Your first lesson takes about ten minutes.</h2>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" icon={Mail} onClick={onEmail}>Start with email</Button>
          <Button size="lg" variant="outline" icon={Wallet} onClick={onWallet}>Connect a wallet</Button>
        </div>
      </Card>
      <p className="mx-auto mt-6 max-w-app text-center text-xs text-muted">
        LearnIt is an independent app built on <Link href="https://www.gooddollar.org" className="underline underline-offset-2 hover:text-ink" target="_blank" rel="noreferrer">GoodDollar</Link> and Celo.
      </p>
    </section>
  );
}
