import { describe, it, expect } from "vitest";
import { afterLoss, livesNow, MAX_LIVES, REGEN_MS } from "../src/livesLogic";

const T = 1_800_000_000_000;
const at = (ms: number) => new Date(ms);

describe("livesNow", () => {
  it("is full with no wait", () => expect(livesNow(MAX_LIVES, null, T)).toEqual({ lives: MAX_LIVES, max: MAX_LIVES, nextAt: null }));
  it("counts down to the next life", () => expect(livesNow(3, at(T), T + 10 * 60_000)).toMatchObject({ lives: 3, nextAt: T + REGEN_MS }));
  it("gives a life back every 30 minutes", () => {
    expect(livesNow(3, at(T), T + REGEN_MS).lives).toBe(4);
    expect(livesNow(3, at(T), T + 2 * REGEN_MS + 1).lives).toBe(5);
  });
  it("never goes above the maximum, and the wait ends when full", () => expect(livesNow(1, at(T), T + 99 * REGEN_MS)).toEqual({ lives: MAX_LIVES, max: MAX_LIVES, nextAt: null }));
  it("keeps the next life on its own 30 minute rhythm", () => expect(livesNow(0, at(T), T + REGEN_MS + 60_000)).toMatchObject({ lives: 1, nextAt: T + 2 * REGEN_MS }));
});

describe("afterLoss", () => {
  it("starts the wait when a full bar is first dented", () => {
    const r = afterLoss(MAX_LIVES, null, T);
    expect(r.lives).toBe(4); expect(r.anchor?.getTime()).toBe(T); expect(r.spent).toBe(true);
  });
  it("does not restart the wait for a second loss", () => {
    const r = afterLoss(4, at(T), T + 5 * 60_000);
    expect(r.lives).toBe(3); expect(r.anchor?.getTime()).toBe(T);
  });
  it("keeps progress when a life has already come back", () => {
    const r = afterLoss(3, at(T), T + REGEN_MS + 60_000); // 4 lives now, one wrong answer
    expect(r.lives).toBe(3); expect(r.anchor?.getTime()).toBe(T + REGEN_MS);
  });
  it("restarts the wait when the bar had refilled", () => {
    const r = afterLoss(2, at(T), T + 10 * REGEN_MS);
    expect(r.lives).toBe(4); expect(r.anchor?.getTime()).toBe(T + 10 * REGEN_MS);
  });
  it("spends nothing at zero", () => {
    const r = afterLoss(0, at(T), T + 60_000);
    expect(r).toMatchObject({ lives: 0, spent: false });
  });
  it("spends the last life", () => expect(afterLoss(1, at(T), T + 1000)).toMatchObject({ lives: 0, spent: true }));
});
