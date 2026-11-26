import type { Exercise } from "./content/schema";

export type Answer = number | string[] | { target: string; english: string }[];
export const PASS_ACCURACY = 0.8;
/** No longer a rule for passing. Kept only so the abuse check can spot attempts timed to the old floor. */
export const MIN_SECONDS = 40;

export type ExerciseResult = { id: string; score: number; correct: boolean; wordIds: string[] };

export function gradeExercise(ex: Exercise, ans: Answer | undefined): ExerciseResult {
  if (ex.type === "mc") {
    const ok = typeof ans === "number" && ans === ex.answer;
    return { id: ex.id, score: ok ? 1 : 0, correct: ok, wordIds: ok ? [] : [ex.wordId] };
  }
  if (ex.type === "translate") {
    const ok = Array.isArray(ans) && ans.length === ex.answer.length && ans.every((t, i) => t === ex.answer[i]);
    return { id: ex.id, score: ok ? 1 : 0, correct: ok, wordIds: ok ? [] : ex.wordIds };
  }
  const given = Array.isArray(ans) ? (ans as { target: string; english: string }[]) : [];
  const wrong = ex.pairs.filter((p) => !given.some((g) => g && g.target === p.target && g.english === p.english));
  const score = (ex.pairs.length - wrong.length) / ex.pairs.length;
  return { id: ex.id, score, correct: wrong.length === 0, wordIds: wrong.map((p) => p.wordId) };
}

export function gradeAll(exercises: Exercise[], answers: Record<string, Answer>) {
  const results = exercises.map((e) => gradeExercise(e, answers[e.id]));
  const accuracy = results.reduce((s, r) => s + r.score, 0) / exercises.length;
  const missedWordIds = Array.from(new Set(results.flatMap((r) => r.wordIds)));
  return { results, accuracy, missedWordIds };
}

export function isPass(accuracy: number) {
  return accuracy >= PASS_ACCURACY;
}

/**
 * What an attempt earns. Time never counts against anyone.
 * A lesson is done once every question has been answered: it opens the next lesson and extends the streak, whatever the score.
 * The score is the share answered right on the first try, so every miss lowers it even though missed questions come back to be answered correctly.
 * G$ rewards and leaderboard points need PASS_ACCURACY. A checkpoint is an exam, so it keeps the pass mark for everything.
 */
export function outcomeFor(kind: "lesson" | "checkpoint", accuracy: number) {
  const passed = kind === "lesson" ? true : isPass(accuracy);
  return { passed, rewardEligible: passed && isPass(accuracy) };
}
