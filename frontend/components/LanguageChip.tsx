"use client";
import Link from "next/link";
import { ChevronDown } from "@/lib/icons";
import { useMe } from "@/lib/useMe";
import { langOf } from "@/lib/languages";
import { cn } from "@/lib/cn";
import { Flag } from "./Flag";
import { Sk } from "./Skeletons";

/** Shows the language being learned. Opens the change-language page. */
export function LanguageChip({ block = false }: { block?: boolean }) {
  const { data: me } = useMe();
  if (!me) return <Sk className={cn("h-9 rounded-full", block ? "w-full rounded-btn" : "w-[104px]")} />;
  const l = langOf(me.course);
  return (
    <Link href="/language" aria-label={`Learning ${l.english}. Change language`}
      className={cn("inline-flex items-center gap-2 border border-line bg-surface text-sm font-medium text-ink shadow-card transition hover:border-line-strong",
        block ? "w-full rounded-btn px-3 py-2.5" : "h-9 rounded-full pl-1.5 pr-2.5")}>
      <Flag code={l.code} size={block ? 22 : 24} />
      <span lang={l.code} className={cn(block ? "flex-1" : "max-sm:sr-only")}>{l.native}</span>
      {block && <span className="text-xs font-normal text-muted">Change</span>}
      {!block && <ChevronDown size={14} strokeWidth={2.25} className="text-muted" aria-hidden />}
    </Link>
  );
}
