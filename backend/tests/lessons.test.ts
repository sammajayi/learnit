import { describe, it, expect } from "vitest";
import { COURSES, currentUnitFor } from "../src/lessons";

describe("currentUnitFor", () => {
  it("starts on unit 1 with nothing passed", () => {
    expect(currentUnitFor("fr", new Set())).toBe(COURSES.fr[0]);
  });
  it("stays on unit 1 until its checkpoint is passed, even with all lessons done", () => {
    const passed = new Set(COURSES.fr[0].lessons.map((l) => l.id));
    expect(currentUnitFor("fr", passed)).toBe(COURSES.fr[0]);
  });
  it("advances to unit 2 once unit 1's lessons and checkpoint are passed", () => {
    const passed = new Set([...COURSES.fr[0].lessons.map((l) => l.id), COURSES.fr[0].checkpoint.id]);
    expect(currentUnitFor("fr", passed)).toBe(COURSES.fr[1]);
  });
  it("lands on the last unit once the whole course is done", () => {
    const passed = new Set(COURSES.es.flatMap((u) => [...u.lessons.map((l) => l.id), u.checkpoint.id]));
    expect(currentUnitFor("es", passed)).toBe(COURSES.es[COURSES.es.length - 1]);
  });
});

describe("A1 content", () => {
  for (const lang of ["fr", "es"] as const) {
    it(`${lang}: 8 units of 10 six-question lessons and a 60-question checkpoint pool`, () => {
      expect(COURSES[lang]).toHaveLength(8);
      for (const u of COURSES[lang]) {
        expect(u.lessons).toHaveLength(10);
        for (const l of u.lessons) { expect(l.exercises).toHaveLength(6); expect(l.intro).toHaveLength(4); }
        expect(u.checkpoint.pool.length).toBeGreaterThanOrEqual(40);
      }
    });
    it(`${lang}: every id is unique and every multiple-choice answer is one of its options`, () => {
      const ids = new Set<string>();
      for (const u of COURSES[lang]) {
        for (const id of [...u.lessons.map((l) => l.id), u.checkpoint.id, ...u.lessons.flatMap((l) => l.exercises.map((e) => e.id)), ...u.checkpoint.pool.map((e) => e.id)]) {
          expect(ids.has(id), id).toBe(false); ids.add(id);
        }
        for (const e of [...u.lessons.flatMap((l) => l.exercises), ...u.checkpoint.pool]) {
          if (e.type === "mc") { expect(new Set(e.options).size).toBe(4); expect(e.options[e.answer]).toBeTruthy(); }
          if (e.type === "translate") for (const t of e.answer) expect(e.bank).toContain(t);
        }
      }
    });
  }
});
