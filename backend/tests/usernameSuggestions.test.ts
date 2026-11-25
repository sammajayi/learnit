import { describe, it, expect } from "vitest";
import { usernameSuggestions } from "../../frontend/lib/usernameSuggestions";
import { validateUsername } from "../src/profile";

describe("username suggestions", () => {
  it("offers the course code first", () => {
    expect(usernameSuggestions("samm", "fr")[0]).toBe("samm_fr");
    expect(usernameSuggestions("Samm", "es")[0]).toBe("samm_es");
  });
  it("only offers valid, different names within the length limit", () => {
    for (const s of usernameSuggestions("a_very_long_name_here", "fr")) {
      expect(validateUsername(s).ok).toBe(true);
      expect(s.length).toBeLessThanOrEqual(20);
      expect(s).not.toBe("a_very_long_name_here");
    }
  });
  it("has nothing to suggest for an empty name", () => {
    expect(usernameSuggestions("  ", "fr")).toEqual([]);
  });
});
