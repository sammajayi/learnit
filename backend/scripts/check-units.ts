// Quick structural check for hand-written unit data. Usage: npx tsx scripts/check-units.ts a2 fr|es   (run from backend/)
import { FR_A1 } from "./a1/fr";
import { ES_A1 } from "./a1/es";
import { FR_A2 } from "./a2/fr";
import { ES_A2 } from "./a2/es";
import type { UnitData } from "./a1/helpers";

const [level, lang] = process.argv.slice(2);
const table: Record<string, Record<string, UnitData[]>> = { a1: { fr: FR_A1, es: ES_A1 }, a2: { fr: FR_A2, es: ES_A2 } };
const units = table[level]?.[lang];
if (!units) { console.error("usage: check-units.ts a1|a2 fr|es"); process.exit(1); }
let bad = 0;
const fail = (m: string) => { bad++; console.error("  x", m); };
units.forEach((u, i) => {
  console.log(`unit ${i + 1}: ${u.title}`);
  if (u.themes.length !== 5) fail(`needs 5 themes, has ${u.themes.length}`);
  const seen = { t: new Set<string>(), e: new Set<string>() };
  for (const th of u.themes) {
    if (th.words.length !== 8) fail(`"${th.title}": needs 8 words, has ${th.words.length}`);
    if (th.sentences.length !== 3) fail(`"${th.title}": needs 3 sentences`);
    for (const [t, e] of th.words) {
      for (const [k, v] of [["t", t], ["e", e]] as const) { const x = v.toLowerCase(); if (seen[k].has(x)) fail(`duplicate ${k} "${v}" in unit`); seen[k].add(x); }
      if (!t || !e) fail(`empty word in "${th.title}"`);
    }
    for (const s of th.sentences) {
      if (s.extra.length !== 2) fail(`"${s.english}": needs 2 distractor words, has ${s.extra.length}`);
      if (s.target.length < 2) fail(`"${s.english}": sentence too short`);
      if (s.extra.some((x) => s.target.some((t) => t.toLowerCase() === x.toLowerCase()))) fail(`"${s.english}": a distractor is also in the answer`);
    }
    if (th.tip && (th.tip.body.split(/[.!?]/).filter(Boolean).length > 4 || th.tip.body.length > 280)) fail(`"${th.title}": tip too long`);
    const all = JSON.stringify(th);
    if (/[—–]/.test(all)) fail(`"${th.title}": contains a dash character (— or –)`);
  }
  if (/[—–]/.test(u.title + u.blurb)) fail("dash in unit title or blurb");
});
console.log(bad ? `${bad} problem(s)` : "ok");
process.exit(bad ? 1 : 0);
