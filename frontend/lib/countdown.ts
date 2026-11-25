/**
 * Words for a wait until the next daily claim, as a fragment: "next in 14h 22m". It follows "Claimed ·" on the claim row.
 * Hours and minutes, never "00:00:00": a claim that is moments away says so, and a missing time says it is coming.
 */
export function nextClaimText(secondsLeft: number | null): string {
  if (secondsLeft === null || !Number.isFinite(secondsLeft)) return "next claim soon";
  const s = Math.max(0, Math.ceil(secondsLeft));
  if (s === 0) return "next claim now";
  if (s < 60) return "next in under 1m";
  const m = Math.ceil(s / 60);
  const h = Math.floor(m / 60), r = m % 60;
  return `next in ${h > 0 ? `${h}h ${r}m` : `${r}m`}`;
}
