import { describe, it, expect } from "vitest";
import { shouldOfferVotePrompt, VOTE_SNOOZE_MS, type VotePromptInput } from "../../frontend/lib/votePrompt";

const base: VotePromptInput = { onboarded: true, verified: true, voted: false, ballotKind: "none-to-add", snoozedUntil: 0, seenThisVisit: false, now: 1_000_000 };

describe("vote popup", () => {
  it("is offered to a verified person who can vote and has not", () => {
    expect(shouldOfferVotePrompt(base)).toBe(true);
    expect(shouldOfferVotePrompt({ ...base, ballotKind: "needs-claim" })).toBe(true);
  });
  it("is never offered to someone who has voted", () => {
    expect(shouldOfferVotePrompt({ ...base, voted: true })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, ballotKind: "already-voted" })).toBe(false);
  });
  it("is not offered when the person cannot vote yet, or the chain is still being read", () => {
    expect(shouldOfferVotePrompt({ ...base, verified: false })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, onboarded: false })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, ballotKind: "not-verified" })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, ballotKind: "all-used" })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, ballotKind: null })).toBe(false);
  });
  it("stays away for three days after Not now, then comes back", () => {
    const until = base.now + VOTE_SNOOZE_MS;
    expect(VOTE_SNOOZE_MS).toBe(3 * 86_400_000);
    expect(shouldOfferVotePrompt({ ...base, snoozedUntil: until })).toBe(false);
    expect(shouldOfferVotePrompt({ ...base, snoozedUntil: until, now: until + 1 })).toBe(true);
  });
  it("is offered once per visit", () => {
    expect(shouldOfferVotePrompt({ ...base, seenThisVisit: true })).toBe(false);
  });
});
