import { describe, it, expect } from "vitest";
import { toPublicMember } from "../src/publicMembers";

const base = { id: "u1", username: "ada", displayName: "Ada", hasAvatar: true, avatarVersion: 2, course: "fr", verifiedUntil: new Date(Date.now() + 86_400_000), createdAt: new Date("2026-11-01T00:00:00Z") };

describe("toPublicMember", () => {
  it("lists only the public fields", () => {
    const m = toPublicMember({ ...base, wallet: "0xabc", email: "a@b.c", flagged: true } as never, 7)!;
    expect(Object.keys(m).sort()).toEqual(["avatarUrl", "course", "displayName", "joined", "lessonsPassed", "username", "verified"]);
    expect(m).toMatchObject({ username: "ada", lessonsPassed: 7, verified: true, avatarUrl: "/api/avatar/u1?v=2" });
  });
  it("leaves out people without a username", () => {
    expect(toPublicMember({ ...base, username: null }, 3)).toBeNull();
  });
  it("shows an expired verification as not verified", () => {
    expect(toPublicMember({ ...base, verifiedUntil: new Date(Date.now() - 1000) }, 0)!.verified).toBe(false);
    expect(toPublicMember({ ...base, verifiedUntil: null }, 0)!.verified).toBe(false);
  });
  it("has no avatar url when there is no photo", () => {
    expect(toPublicMember({ ...base, hasAvatar: false }, 0)!.avatarUrl).toBeNull();
  });
});
