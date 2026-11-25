import { USERNAME_MAX, validateUsername } from "@learnit/backend/profile";

/**
 * Other usernames to offer when one is taken, best first: the course code ("samm_fr"), then a number.
 * Every suggestion is a valid username on its own. Availability is checked by the caller.
 */
export function usernameSuggestions(taken: string, course: string): string[] {
  const base = taken.trim().toLowerCase();
  if (!base) return [];
  const out: string[] = [];
  for (const tail of [`_${course}`, `_${course}2`, "_learns", "1", "2"]) {
    const v = validateUsername(base.slice(0, USERNAME_MAX - tail.length) + tail);
    if (v.ok && v.value !== base && !out.includes(v.value)) out.push(v.value);
  }
  return out;
}
