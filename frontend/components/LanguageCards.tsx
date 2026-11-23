"use client";
import { Check } from "@/lib/icons";
import { LANGS, type Course } from "@/lib/languages";
import { cn } from "@/lib/cn";
import { Flag } from "./Flag";

/** The French / Spanish picker, shared by onboarding and the change-language page. */
export function LanguageCards({ value, onSelect, disabled }: { value: Course | null; onSelect: (c: Course) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Language" className="grid gap-3 sm:grid-cols-2">
      {LANGS.map((l) => {
        const on = value === l.code;
        return (
          <button key={l.code} role="radio" aria-checked={on} disabled={disabled} onClick={() => onSelect(l.code)}
            className={cn("group relative flex flex-col rounded-card border bg-surface p-5 text-left shadow-card transition duration-200 ease-soft disabled:opacity-60",
              on ? "border-ink ring-4 ring-ink/5" : "border-line hover:-translate-y-px hover:border-line-strong hover:shadow-raised")}>
            <div className="flex items-center justify-between">
              <Flag code={l.code} size={40} />
              <span className={cn("grid h-6 w-6 place-items-center rounded-full border transition", on ? "border-ink bg-ink text-white" : "border-line-strong")}>
                {on && <Check size={14} strokeWidth={3} aria-hidden />}
              </span>
            </div>
            <span lang={l.code} className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink">{l.native}</span>
            <span className="text-sm text-muted">{l.english} · <span lang={l.code}>{l.greeting}</span></span>
            <span className="mt-3 text-pretty text-sm leading-relaxed text-ink-2">{l.speakers}.</span>
          </button>
        );
      })}
    </div>
  );
}
