"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./LogoMark";

const KEY = "learnit.splash-seen";
const SHOW_MS = 1500;

/**
 * The LearnIt "i" symbol, drawn in on the first screen of a visit: the tile settles, the stem grows up, then the accent drops in
 * with a small bounce. It plays once per browser session on app screens (never on the public landing page or /admin), covers the
 * page for about a second and a half, then fades out. With reduced motion it is a still symbol that simply fades.
 * The artwork is the same as /brand/learnit-symbol-light.svg.
 */
export function Splash() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (path === "/" || path === "/admin" || path.startsWith("/admin/")) return;
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, "1"); } catch { /* private window: it just plays again next visit */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), reduce ? 700 : SHOW_MS);
    return () => clearTimeout(t);
    // Only the first screen of a visit decides; later navigation must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash" aria-hidden
          className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-canvas"
          initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <LogoMark mode="draw" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
