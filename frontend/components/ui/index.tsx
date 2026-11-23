"use client";
/*
  LearnIt UI primitives, in the shadcn/ui style: small, unopinionated components that own their markup
  and take a className to adjust. Everything reads from the tokens in app/globals.css.
*/
import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, Loader2, PauseCircle, type IconType } from "@/lib/icons";
import { cn } from "@/lib/cn";

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "subtle" | "inverse";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-coral-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(15_23_42/0.12)] hover:bg-coral-700 disabled:bg-line-strong disabled:text-ink-2/70 disabled:opacity-100 disabled:shadow-none",
  secondary: "bg-ink text-white hover:bg-[#1e293b] disabled:bg-line-strong disabled:text-ink-2/70 disabled:opacity-100",
  outline: "border border-control bg-surface text-ink hover:border-ink/40 hover:bg-canvas",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  subtle: "bg-sage-50 text-sage-700 hover:bg-sage-100",
  inverse: "bg-white text-ink hover:bg-white/90",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-[15px]",
  lg: "h-[52px] gap-2 px-6 text-base",
};

export function buttonClass({ variant = "primary", size = "md", block = false, className }: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-btn font-semibold tracking-[-0.01em] transition duration-200 ease-soft",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45",
    VARIANT[variant], SIZE[size], block && "w-full", className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; block?: boolean; loading?: boolean; icon?: IconType; iconRight?: IconType };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading, icon: Icon, iconRight: IconRight, className, children, disabled, ...rest }, ref,
) {
  const s = size === "sm" ? 16 : 18;
  return (
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass({ variant, size, block, className })} {...rest}>
      {loading ? <Loader2 size={s} className="animate-spin" aria-hidden /> : Icon && <Icon size={s} strokeWidth={2} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight size={s} strokeWidth={2} aria-hidden className="-mr-0.5" />}
    </button>
  );
});

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; block?: boolean; icon?: IconType; iconRight?: IconType };

export function ButtonLink({ variant, size, block, icon: Icon, iconRight: IconRight, className, children, ...rest }: ButtonLinkProps) {
  const s = size === "sm" ? 16 : 18;
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      {Icon && <Icon size={s} strokeWidth={2} aria-hidden />}
      {children}
      {IconRight && <IconRight size={s} strokeWidth={2} aria-hidden className="-mr-0.5" />}
    </Link>
  );
}

/* ---------- Card ---------- */

export function Card({ className, interactive, ...rest }: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        interactive && "transition duration-200 ease-soft hover:-translate-y-px hover:border-line-strong hover:shadow-raised",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ title, description, action, className, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; id?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */

type Tone = "neutral" | "sage" | "coral" | "navy" | "outline";
const TONE: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  sage: "bg-sage-50 text-sage-700 ring-1 ring-inset ring-sage-100",
  coral: "bg-coral-50 text-coral-700 ring-1 ring-inset ring-coral-100",
  navy: "bg-ink text-white",
  outline: "text-ink-2 ring-1 ring-inset ring-line-strong",
};

export function Badge({ tone = "neutral", icon: Icon, className, children }: { tone?: Tone; icon?: IconType; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE[tone], className)}>
      {Icon && <Icon size={13} strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  );
}

/* ---------- Progress ---------- */

/** A thin bar that fills gently. `value` is 0 to 1. */
export function Progress({ value, className, tone = "sage", label }: { value: number; className?: string; tone?: "sage" | "coral" | "navy"; label?: string }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = tone === "coral" ? "bg-coral-500" : tone === "navy" ? "bg-ink" : "bg-sage-500";
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} className={cn("h-2 overflow-hidden rounded-full bg-sunken", className)}>
      <motion.div className={cn("h-full w-full origin-left rounded-full", fill)} initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/** A ring that fills gently. Children sit in the middle. */
export function ProgressRing({ value, size = 48, stroke = 4, tone = "sage", className, children, label }: { value: number; size?: number; stroke?: number; tone?: "sage" | "coral" | "navy" | "white"; className?: string; children?: ReactNode; label?: string }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const color = tone === "coral" ? "var(--coral-500)" : tone === "navy" ? "var(--ink)" : tone === "white" ? "#fff" : "var(--sage-500)";
  const track = tone === "white" ? "rgb(255 255 255 / 0.18)" : "var(--sunken)";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={track} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={color} strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/* ---------- Notice ---------- */

type NoticeTone = "info" | "success" | "warning" | "danger" | "paused";
const NOTICE: Record<NoticeTone, { cls: string; Icon: IconType }> = {
  info: { cls: "border-line bg-surface text-ink-2", Icon: Info },
  success: { cls: "border-sage-100 bg-sage-50 text-sage-700", Icon: CheckCircle2 },
  warning: { cls: "border-coral-100 bg-coral-50 text-coral-700", Icon: AlertCircle },
  danger: { cls: "border-coral-100 bg-coral-50 text-danger", Icon: AlertCircle },
  paused: { cls: "border-line-strong bg-sunken text-ink-2", Icon: PauseCircle },
};

/** An inline message. `danger` notices are announced to screen readers. */
export function Notice({ tone = "info", title, children, className, action }: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const { cls, Icon } = NOTICE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-input border px-4 py-3 text-sm", cls, className)}>
      <Icon size={18} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-pretty leading-relaxed")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ---------- Form ---------- */

export const fieldClass =
  "w-full rounded-input border border-control bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 transition duration-150 " +
  "hover:border-ink/30 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/15 disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-70 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10";

export function Label({ className, ...rest }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...rest} />;
}

/* ---------- Layout bits ---------- */

/** Page title block: an optional small label, the title, a description and actions on the right. */
export function PageHeader({ eyebrow, title, description, action, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-eyebrow uppercase text-muted">{eyebrow}</p>}
        <h1 className="font-display text-display-md text-ink sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-pretty text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** A labelled number. Numbers use tabular figures so they don't jitter as they change. */
export function Stat({ label, value, unit, hint, className, icon: Icon }: { label: ReactNode; value: ReactNode; unit?: ReactNode; hint?: ReactNode; className?: string; icon?: IconType }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">{Icon && <Icon size={14} strokeWidth={2} aria-hidden />}{label}</p>
      <p className="tabular mt-1 truncate text-2xl font-semibold tracking-[-0.02em] text-ink">
        {value}{unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }: { icon: IconType; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center", className)}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-sunken text-ink-2"><Icon size={20} strokeWidth={1.75} aria-hidden /></span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-[42ch] text-pretty text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A small G$ mark, so amounts read as GoodDollar at a glance. */
export function GMark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span aria-hidden className={cn("inline-grid shrink-0 place-items-center rounded-full bg-sage-100 font-semibold text-sage-700", className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      G$
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
