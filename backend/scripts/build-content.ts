// Generates src/content/{fr,es}/unit{N}.json and src/content/index.ts from scripts/a1/*.ts.
// 10 short lessons per unit, 6 questions each. Units 1-8 are A0/A1, units 9+ are A2. Run from the repo root: npm run content
import { mkdirSync, writeFileSync } from "node:fs";
import { FR_A1 } from "./a1/fr";
import { ES_A1 } from "./a1/es";
import { FR_A2 } from "./a2/fr";
import { ES_A2 } from "./a2/es";
import type { UnitData } from "./a1/helpers";
import { UnitSchema, type Exercise, type Lang, type Level } from "../src/content/schema";

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function shuffle<T>(a: T[], r: () => number) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const tokensOf = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);

/** Words the learner has met so far in this language, so a lesson's sentence can lean on what is already known. */
type Known = Set<string>;

/** `idLevel` is baked into ids that learners' progress is stored under, so it never changes once published:
 *  the first 8 units keep "a1" even though the first 3 are now shown as A0. */
function build(lang: Lang, data: UnitData, unitNum: number, known: Known, level: Level, idLevel: "a1" | "a2") {
  const r = rng((lang === "fr" ? 11 : 29) + unitNum * 1009);
  const themes = data.themes;
  if (themes.length !== 5) throw new Error(`${lang} unit ${unitNum}: need 5 themes, got ${themes.length}`);
  const all = themes.flatMap((l, li) => {
    if (l.words.length !== 8) throw new Error(`${lang} unit ${unitNum} "${l.title}": need 8 words, got ${l.words.length}`);
    if (l.sentences.length !== 3) throw new Error(`${lang} unit ${unitNum} "${l.title}": need 3 sentences`);
    return l.words.map((w, wi) => ({ id: `${lang}-${idLevel}u${unitNum}-w${li * 8 + wi + 1}`, t: w[0], e: w[1], li }));
  });
  // A multiple-choice question must have exactly one right answer, so no two words in a unit may share a spelling or a meaning.
  for (const key of ["t", "e"] as const) {
    const seen = new Set<string>();
    for (const w of all) { const k = w[key].toLowerCase(); if (seen.has(k)) throw new Error(`${lang} unit ${unitNum}: duplicate ${key} "${w[key]}"`); seen.add(k); }
  }
  const speechLang = lang === "fr" ? "fr-FR" : "es-ES";
  const P = `${lang}-${idLevel}-u${unitNum}`;

  const mc = (w: (typeof all)[number], idx: number, pool: typeof all): Exercise => {
    const toEnglish = idx % 2 === 0;
    const others = shuffle(pool.filter((p) => p.id !== w.id), r).slice(0, 3);
    const opts = shuffle([w, ...others], r);
    return {
      id: `${w.id}-${toEnglish ? "te" : "et"}`, type: "mc", wordId: w.id,
      prompt: toEnglish ? `What does "${w.t}" mean?` : `How do you say "${w.e}"?`,
      speak: toEnglish ? w.t : undefined,
      options: opts.map((o) => (toEnglish ? o.e : o.t)),
      answer: opts.findIndex((o) => o.id === w.id),
    };
  };
  const tr = (li: number, si: number, id: string): Exercise => {
    const s = themes[li].sentences[si];
    return { id, type: "translate", prompt: s.english, answer: s.target, bank: shuffle([...s.target, ...s.extra], r), wordIds: [] };
  };
  const match = (id: string, ws: typeof all): Exercise => ({ id, type: "match", prompt: "Match the pairs", pairs: ws.map((w) => ({ wordId: w.id, target: w.t, english: w.e })) });

  const lessons = themes.flatMap((theme, li) => {
    const ws = all.filter((w) => w.li === li);
    // Pick the sentence that uses the most words the learner already knows, so a beginner is never asked to build a sentence from words they have not met.
    const score = (si: number, learned: Set<string>) => { const t = theme.sentences[si].target.flatMap(tokensOf); return t.filter((x) => learned.has(x)).length / t.length; };
    const firstHalf = new Set([...known, ...ws.slice(0, 4).flatMap((w) => tokensOf(w.t))]);
    const wholeTheme = new Set([...known, ...ws.flatMap((w) => tokensOf(w.t))]);
    const order = [0, 1, 2];
    const pick1 = order.reduce((best, si) => (score(si, firstHalf) > score(best, firstHalf) ? si : best), 0);
    const pick2 = order.filter((si) => si !== pick1).reduce((best, si) => (score(si, wholeTheme) > score(best, wholeTheme) ? si : best), order.find((si) => si !== pick1)!);
    ws.forEach((w) => tokensOf(w.t).forEach((x) => known.add(x)));
    return [0, 1].map((half) => {
      const hw = ws.slice(half * 4, half * 4 + 4);
      const no = li * 2 + half + 1;
      const m = (i: number) => mc(hw[i], i, ws);
      const exercises: Exercise[] = [m(0), m(1), match(`${P}-l${no}-m`, hw), m(2), m(3), tr(li, half === 0 ? pick1 : pick2, `${P}-l${no}-s`)];
      return { id: `${P}-l${no}`, title: `${theme.title}, part ${half + 1}`, theme: theme.theme, exercises, intro: hw.map((w) => ({ target: w.t, english: w.e })), ...(half === 0 && theme.tip ? { tip: theme.tip } : {}) };
    });
  });

  const pool: Exercise[] = [
    ...all.map((w, i) => ({ ...mc(w, i, all), id: `${P}-cp-${w.id}` })),
    ...themes.flatMap((_, li) => [0, 1, 2].map((si) => tr(li, si, `${P}-cp-l${li + 1}-s${si + 1}`))),
    ...themes.map((_, li) => match(`${P}-cp-m${li + 1}`, shuffle(all.filter((w) => w.li === li), r).slice(0, 5))),
  ];
  return UnitSchema.parse({
    lang, unit: unitNum, level, title: data.title, blurb: data.blurb, speechLang, lessons,
    checkpoint: { id: `${P}-cp`, title: `Unit ${unitNum} checkpoint`, pool, draw: 20 },
  });
}

/** Level shown to learners, by unit number. Ids stay as first published (see build). */
const A1_LEVELS: Level[] = ["A1", "A1", "A1", "A1", "A1", "A1", "A1", "A1"]; // units 1-3 can be relabelled A0 later; the ids never change
const courses: Record<Lang, { data: UnitData; level: Level; idLevel: "a1" | "a2" }[]> = {
  fr: [...FR_A1.map((data, i) => ({ data, level: A1_LEVELS[i], idLevel: "a1" as const })), ...FR_A2.map((data) => ({ data, level: "A2" as Level, idLevel: "a2" as const }))],
  es: [...ES_A1.map((data, i) => ({ data, level: A1_LEVELS[i], idLevel: "a1" as const })), ...ES_A2.map((data) => ({ data, level: "A2" as Level, idLevel: "a2" as const }))],
};
const imports: string[] = [];
const lists: Record<string, string[]> = { fr: [], es: [] };
for (const lang of ["fr", "es"] as const) {
  mkdirSync(`src/content/${lang}`, { recursive: true });
  const known: Known = new Set();
  courses[lang].forEach(({ data, level, idLevel }, i) => {
    const n = i + 1;
    const u = build(lang, data, n, known, level, idLevel);
    writeFileSync(`src/content/${lang}/unit${n}.json`, JSON.stringify(u, null, 2) + "\n");
    imports.push(`import ${lang}${n} from "./${lang}/unit${n}.json";`);
    lists[lang].push(`${lang}${n}`);
    console.log(lang, level, "unit", n, data.title, "lessons", u.lessons.length, "pool", u.checkpoint.pool.length);
  });
}
writeFileSync("src/content/index.ts", `// Generated by scripts/build-content.ts. Do not edit.\n${imports.join("\n")}\n\nexport const RAW_UNITS = { fr: [${lists.fr.join(", ")}], es: [${lists.es.join(", ")}] };\n`);
