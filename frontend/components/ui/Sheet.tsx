"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { X } from "@/components/icons";
import { cn } from "@/lib/cn";

/** True from the `sm` breakpoint up, where a sheet becomes a centred modal. Starts false so the first render matches the server. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return desktop;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet on a phone and a modal on desktop, or with `modal`, a centred popup box everywhere.
 * Motion: a spring (response 0.3 s, damping ratio about 0.9) on transform and opacity only. It starts from wherever the
 * element is, so opening, closing or dragging mid-animation never waits for the last one to finish, and input is never blocked.
 * On a phone the sheet drags down from its handle and closes past a short distance or a quick flick. With reduced motion
 * it only fades. `onClose` is a request: the parent may keep the sheet open (for example to ask about unsaved changes).
 */
export function Sheet({ open, onClose, title, children, footer, className, modal = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; className?: string;
  /** Always a centred popup box, even on a phone: no bottom sheet and no drag handle. */
  modal?: boolean;
}) {
  const reduce = useReducedMotion();
  const wide = useIsDesktop();
  const desktop = wide || modal; // "desktop" here means the centred layout
  const controls = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = "sheet-title";
  useEffect(() => setMounted(true), []);

  // Keyboard: Escape asks to close, Tab stays inside. Focus goes in on open and back to the opener on close. The page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const t = setTimeout(() => { (panel.current?.querySelector<HTMLElement>("input,textarea,select") ?? panel.current)?.focus({ preventScroll: true }); }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); html.style.overflow = prev; opener.current?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);

  if (!mounted) return null;

  const spring = { type: "spring" as const, duration: 0.3, bounce: 0.1 };
  const fade = { duration: 0.15 };
  const variants = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : desktop
      ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 } }
      : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };
  const draggable = !desktop && !reduce;
  const onDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn("fixed inset-0 z-50 flex", desktop ? "items-center justify-center p-4" : "items-end")}>
          <motion.div aria-hidden className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} onPointerDown={onClose} />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
            {...variants} transition={reduce ? fade : spring}
            drag={draggable ? "y" : false} dragListener={false} dragControls={controls} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} dragSnapToOrigin onDragEnd={onDragEnd}
            className={cn("relative flex max-h-[92dvh] w-full flex-col bg-surface shadow-float outline-none focus-visible:outline-none will-change-transform",
              desktop ? cn("rounded-card focus-visible:rounded-card", modal ? "max-w-[420px]" : "max-w-[480px]") : "rounded-t-[24px] focus-visible:rounded-t-[24px] focus-visible:rounded-b-none", className)}>
            {!desktop && (
              <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)} aria-hidden>
                <span className="h-1 w-10 rounded-full bg-line-strong" />
              </div>
            )}
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-2 sm:pt-5" onPointerDown={(e) => { if (!desktop && e.target === e.currentTarget) controls.start(e); }}>
              <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-100 hover:bg-sunken hover:text-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/15"><X size={18} aria-hidden /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
            {footer && <div className="shrink-0 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
