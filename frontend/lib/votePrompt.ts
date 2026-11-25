/** How long "Not now" hides the vote popup. */
export const VOTE_SNOOZE_MS = 3 * 86_400_000;

export type VotePromptInput = {
  onboarded: boolean;
  verified: boolean;
  /** This wallet has already voted for LearnIt. */
  voted: boolean;
  /** What the vote button would do for this wallet, or null while that is still being read from the chain. */
  ballotKind: "none-to-add" | "needs-claim" | "already-voted" | "not-verified" | "all-used" | null;
  /** Milliseconds since epoch until which the person asked not to see it, or 0. */
  snoozedUntil: number;
  /** Already shown during this visit. */
  seenThisVisit: boolean;
  now: number;
};

/**
 * Whether to offer the vote popup now. It goes to people who can actually vote and have not: verified, onboarded, and the chain
 * says a vote can be placed (or voting rights can be claimed). It never shows to someone who has voted, to someone who cannot
 * vote yet (they would only meet an error), while the chain is still being read, after "Not now" for a few days, or twice in one visit.
 */
export function shouldOfferVotePrompt(i: VotePromptInput): boolean {
  if (!i.onboarded || !i.verified || i.voted) return false;
  if (i.ballotKind !== "none-to-add" && i.ballotKind !== "needs-claim") return false;
  if (i.seenThisVisit || i.snoozedUntil > i.now) return false;
  return true;
}
