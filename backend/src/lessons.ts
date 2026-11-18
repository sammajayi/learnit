import { RAW_UNITS } from "./content";
import { UnitSchema, type Exercise, type Lang, type Unit } from "./content/schema";

/** Each language's units in order (A0 to A2; units 1 to 3 are A0, 4 to 8 A1, 9 onwards A2). A course is just this list walked front to back. */
export const COURSES: Record<Lang, Unit[]> = {
  fr: RAW_UNITS.fr.map((u) => UnitSchema.parse(u)),
  es: RAW_UNITS.es.map((u) => UnitSchema.parse(u)),
};

/** The unit a learner is currently working through: the first with an unfinished lesson or
 *  checkpoint, or the last unit once everything is done. */
export function currentUnitFor(course: Lang, passedIds: Set<string>): Unit {
  const units = COURSES[course];
  for (const u of units) {
    if (!u.lessons.every((l) => passedIds.has(l.id)) || !passedIds.has(u.checkpoint.id)) return u;
  }
  return units[units.length - 1];
}

export function findLesson(id: string) {
  for (const lang of ["fr", "es"] as const) {
    for (const u of COURSES[lang]) {
      const l = u.lessons.find((x) => x.id === id);
      if (l) return { lang, unit: u, lesson: l };
    }
  }
  return null;
}
export function findCheckpoint(id: string) {
  for (const lang of ["fr", "es"] as const) {
    for (const u of COURSES[lang]) if (u.checkpoint.id === id) return { lang, unit: u, checkpoint: u.checkpoint };
  }
  return null;
}

/** Fisher-Yates with a seeded LCG so a checkpoint draw can be re-derived at grading time. */
export function seededDraw<T>(pool: T[], seed: number, n: number): T[] {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

export type PublicExercise =
  | { id: string; type: "mc"; prompt: string; speak?: string; options: string[] }
  | { id: string; type: "translate"; prompt: string; bank: string[] }
  | { id: string; type: "match"; prompt: string; left: string[]; right: string[]; pairs: { target: string; english: string }[] };

/** Removes answers before sending to the client. Match right column is reshuffled by a seed. */
export function toPublic(ex: Exercise, seed = 1): PublicExercise {
  if (ex.type === "mc") return { id: ex.id, type: "mc", prompt: ex.prompt, speak: ex.speak, options: ex.options };
  if (ex.type === "translate") return { id: ex.id, type: "translate", prompt: ex.prompt, bank: ex.bank };
  const left = ex.pairs.map((p) => p.target);
  const right = seededDraw(ex.pairs.map((p) => p.english), seed + ex.id.length, ex.pairs.length);
  // Match is checked on the device for instant feedback; the final grade is still computed on the server from what is submitted.
  return { id: ex.id, type: "match", prompt: ex.prompt, left, right, pairs: ex.pairs.map((p) => ({ target: p.target, english: p.english })) };
}
