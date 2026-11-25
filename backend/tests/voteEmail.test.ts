import { describe, it, expect } from "vitest";
import { voteEmail, VOTE_APP_URL, VOTE_TELEGRAM_URL } from "../src/voteEmail";

describe("vote email", () => {
  const { subject, html } = voteEmail();
  it("has a subject and the app and Telegram links", () => {
    expect(subject).toBe("Vote for LearnIt in GoodBuilders Season 5");
    expect(html).toContain(`${VOTE_APP_URL}/profile`);
    expect(html).toContain(VOTE_TELEGRAM_URL);
  });
  it("has no em dashes", () => {
    expect(html).not.toContain("—");
    expect(subject).not.toContain("—");
  });
  it("tells people where to vote", () => {
    expect(html).toContain("Vote for LearnIt");
    expect(html).toContain("Profile");
  });
});
