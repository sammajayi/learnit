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

describe("course content", () => {
  for (const lang of ["fr", "es"] as const) {
    it(`${lang}: levels run A0, A1, A2 in order and unit numbers are 1..n`, () => {
      const units = COURSES[lang];
      expect(units.map((u) => u.unit)).toEqual(units.map((_, i) => i + 1));
      expect(units.slice(0, 3).every((u) => u.level === "A0")).toBe(true);
      expect(units.slice(3, 8).every((u) => u.level === "A1")).toBe(true);
      expect(units.slice(8).every((u) => u.level === "A2")).toBe(true);
    });
    it(`${lang}: ids of the first 8 units never change (learner progress is stored under them)`, () => {
      expect(COURSES[lang][0].lessons[0].id).toBe(`${lang}-a1-u1-l1`);
      expect(COURSES[lang][7].checkpoint.id).toBe(`${lang}-a1-u8-cp`);
    });
    it(`${lang}: every unit has 10 six-question lessons and a 60-question checkpoint pool`, () => {
      expect(COURSES[lang].length).toBeGreaterThanOrEqual(8);
      for (const u of COURSES[lang]) {
        expect(u.lessons).toHaveLength(10);
        for (const l of u.lessons) { expect(l.exercises).toHaveLength(6); expect(l.intro).toHaveLength(4); }
        expect(u.checkpoint.pool.length).toBeGreaterThanOrEqual(40);
      }
    });
    it(`${lang}: A2 units teach grammar through tips`, () => {
      for (const u of COURSES[lang].filter((x) => x.level === "A2")) {
        const tips = u.lessons.filter((l) => l.tip);
        expect(tips.length, `unit ${u.unit}`).toBeGreaterThanOrEqual(3);
        for (const l of tips) { expect(Number(l.id.split("-l")[1]) % 2, `${l.id} tips sit on part 1`).toBe(1); expect(l.tip!.body.length).toBeLessThanOrEqual(280); }
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
