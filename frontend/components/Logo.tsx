/* The LearnIt logo: the Accent symbol (an i with an acute accent on a sage tile) and the outlined wordmark, as provided in the brand system. */
import { cn } from "@/lib/cn";

/** `compact` shows the symbol alone on very small screens. `inverse` is for dark backgrounds. The wordmark is outlined artwork, so the name stays readable to screen readers through the hidden text. */
export function Logo({ compact = false, inverse = false, className }: { compact?: boolean; inverse?: boolean; className?: string }) {
  const tone = inverse ? "dark" : "light";
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img src={`/brand/learnit-lockup-${tone}.svg`} alt="" width={116} height={30} className={cn("h-[30px] w-auto", compact && "max-[380px]:hidden")} />
      {compact && <img src={`/brand/learnit-symbol-${tone}.svg`} alt="" width={30} height={30} className="hidden h-[30px] w-[30px] max-[380px]:block" />}
      <span className="sr-only">LearnIt</span>
    </span>
  );
}
