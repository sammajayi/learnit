import Link from "next/link";
import { Award, Check, Clock, Lock, Play } from "@/lib/icons";
import { cn } from "@/lib/cn";

export type NodeState = "passed" | "next" | "locked" | "cooldown";

/** One stop on the learning path. The ring around the next stop shows how far through the unit the learner is. */
export function PathNode({ href, state, progress, size = 68, kind = "lesson", label }: { href?: string; state: NodeState; progress: number; size?: number; kind?: "lesson" | "checkpoint"; label: string }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = state === "passed" ? 1 : state === "next" ? Math.max(0.04, progress) : 0;
  const Icon = state === "passed" ? Check : state === "next" ? (kind === "checkpoint" ? Award : Play) : state === "cooldown" ? Clock : kind === "checkpoint" ? Award : Lock;
  const face =
    state === "passed" ? "bg-sage-600 text-white shadow-[0_4px_0_var(--sage-700)]"
    : state === "next" ? "bg-coral-600 text-white shadow-[0_4px_0_var(--coral-700)]"
    : "bg-surface text-muted ring-1 ring-inset ring-line-strong";
  const inner = (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      {state === "next" && <span aria-hidden className="absolute inset-0 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-coral-300/40" />}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--canvas)" strokeWidth={stroke} stroke="var(--line)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - arc)}
          stroke={state === "next" ? "var(--coral-500)" : "var(--sage-300)"} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <span className={cn("relative grid place-items-center rounded-full transition duration-200", face)} style={{ width: size - stroke * 2 - 8, height: size - stroke * 2 - 8 }}>
        <Icon size={kind === "checkpoint" ? 26 : 22} strokeWidth={state === "passed" ? 3 : 2} className={state === "next" && kind === "lesson" ? "translate-x-px fill-current" : ""} aria-hidden />
      </span>
    </span>
  );
  const open = state === "passed" || state === "next";
  if (!open || !href) return <span role="img" aria-label={`${label}, ${state === "cooldown" ? "try again later" : "locked"}`} className="block">{inner}</span>;
  return (
    <Link href={href} aria-label={`${label}, ${state === "passed" ? "completed, replay" : "start"}`}
      className="block rounded-full transition duration-200 ease-soft hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.97]">
      {inner}
    </Link>
  );
}
