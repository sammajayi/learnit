"use client";
import { useEffect, useRef } from "react";
import { CheckCircle2, Lock } from "@/components/icons";
import { cn } from "@/lib/cn";
import { PathNode, type NodeState } from "./PathNode";
import { Badge, ProgressRing } from "./ui";

export type PathNodeData = { id: string; title: string; state: "passed" | "next" | "locked" };
export type PathUnit = { n: number; title: string; blurb: string; level: string; done: number; total: number; lessons: PathNodeData[]; checkpoint: { id: string; state: NodeState; cooldownUntil: string | null } };

// A gentle S-curve, in pixels from the centre line, so the path winds like a trail.
const WIND = [0, 40, 64, 40, 0, -40, -64, -40];

/** The whole A0 to A2 trail: a banner per unit, then a winding line of stops. */
export function LearnPath({ units, currentUnit, nextLessonId }: { units: PathUnit[]; currentUnit: number; nextLessonId: string | null }) {
  const here = useRef<HTMLDivElement>(null);
  // Bring the learner's next stop into view once, so they never have to hunt for where they stopped.
  useEffect(() => {
    here.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  return (
    <div className="grid gap-14">
      {units.map((u) => {
        const current = u.n === currentUnit;
        const locked = u.lessons[0].state === "locked";
        const complete = u.checkpoint.state === "passed";
        return (
          <section key={u.n} aria-labelledby={`unit-${u.n}`}>
            <div className={cn("relative flex items-center gap-4 overflow-hidden rounded-card border p-5 sm:p-6",
              current ? "border-ink bg-ink text-white shadow-raised" : locked ? "border-line bg-sunken/60 text-muted" : "border-line bg-surface shadow-card")}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn("text-eyebrow uppercase", current ? "text-white/60" : "text-muted")}>{u.level} · Unit {u.n}</p>
                  {complete && <Badge tone="sage" icon={CheckCircle2}>Complete</Badge>}
                  {locked && <Lock size={12} aria-label="Locked" />}
                </div>
                <h2 id={`unit-${u.n}`} className={cn("mt-1.5 text-xl font-semibold tracking-[-0.02em]", current ? "text-white" : locked ? "text-ink-2" : "text-ink")}>{u.title}</h2>
                <p className={cn("mt-1 text-pretty text-sm leading-relaxed", current ? "text-white/70" : "text-muted")}>{u.blurb}</p>
              </div>
              <ProgressRing value={u.done / u.total} size={52} stroke={4} tone={current ? "white" : "sage"} label={`${u.done} of ${u.total} done`}>
                <span className={cn("tabular text-xs font-semibold", current ? "text-white" : "text-ink-2")}>{u.done}/{u.total}</span>
              </ProgressRing>
            </div>

            <ol className="mt-12 flex flex-col items-center gap-9">
              {u.lessons.map((l, i) => {
                const isNext = l.id === nextLessonId;
                return (
                  <li key={l.id} style={{ transform: `translateX(${WIND[i % WIND.length]}px)` }} className="relative">
                    {isNext && (
                      <div ref={here} className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-3 py-1 text-xs font-semibold text-coral-700 shadow-raised ring-1 ring-line">
                        {u.done === 0 ? "Start here" : "Up next"}
                        <span aria-hidden className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-surface ring-1 ring-line [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
                      </div>
                    )}
                    <PathNode href={`/learn/${l.id}`} state={l.state} progress={u.done / u.total} label={l.title} />
                    <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 hidden w-40 -translate-y-1/2 text-sm font-medium text-ink-2 sm:block">
                      {l.state !== "locked" && l.title}
                    </span>
                  </li>
                );
              })}
              <li className="mt-2 flex flex-col items-center">
                {u.checkpoint.state === "next" && <div ref={here} />}
                <PathNode href={`/learn/${u.checkpoint.id}`} state={u.checkpoint.state} progress={u.done / u.total} size={88} kind="checkpoint" label={`Unit ${u.n} checkpoint`} />
                <p className="mt-3 text-center text-xs font-medium uppercase tracking-wider text-muted">{u.checkpoint.state === "cooldown" ? "Try again later" : "Checkpoint"}</p>
              </li>
            </ol>
          </section>
        );
      })}
    </div>
  );
}
