import type { Config } from "tailwindcss";

const v = (name: string) => `var(--${name})`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        sunken: v("sunken"),
        ink: { DEFAULT: v("ink"), 2: v("ink-2") },
        muted: v("muted"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        control: v("control"),
        sage: { 50: v("sage-50"), 100: v("sage-100"), 300: v("sage-300"), 500: v("sage-500"), 600: v("sage-600"), 700: v("sage-700") },
        coral: { 50: v("coral-50"), 100: v("coral-100"), 300: v("coral-300"), 500: v("coral-500"), 600: v("coral-600"), 700: v("coral-700") },
        danger: v("danger"),
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Display sizes with tight tracking baked in; body sizes keep Tailwind's defaults.
        "display-xl": ["clamp(2.75rem, 6vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "600" }],
        "display-lg": ["clamp(2rem, 4vw, 3rem)", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-md": ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        eyebrow: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      borderRadius: { card: "16px", input: "12px", btn: "12px" },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.03)",
        raised: "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -10px rgb(15 23 42 / 0.14)",
        float: "0 2px 6px rgb(15 23 42 / 0.05), 0 24px 48px -16px rgb(15 23 42 / 0.22)",
        "inset-line": "inset 0 0 0 1px var(--line)",
      },
      transitionTimingFunction: { soft: "cubic-bezier(0.22, 1, 0.36, 1)" },
      maxWidth: { app: "72rem" },
    },
  },
  plugins: [],
} satisfies Config;
