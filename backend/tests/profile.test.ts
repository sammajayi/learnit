import { describe, it, expect } from "vitest";
import { validateUsername, cleanText, sniffImage, nameFor, avatarUrlFor } from "../src/profile";

describe("username", () => {
  it("lowercases and accepts letters, digits and underscores", () => { expect(validateUsername("  Ada_99 ")).toEqual({ ok: true, value: "ada_99" }); });
  it("rejects too short, too long, bad start and bad characters", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("a".repeat(21)).ok).toBe(false);
    expect(validateUsername("9lives").ok).toBe(false);
    expect(validateUsername("no spaces").ok).toBe(false);
    expect(validateUsername("emoji_😀").ok).toBe(false);
  });
  it("blocks reserved names in any case", () => { expect(validateUsername("Admin").ok).toBe(false); expect(validateUsername("GoodDollar").ok).toBe(false); });
});

describe("cleanText", () => {
  it("trims, collapses whitespace, strips control characters and caps length", () => {
    expect(cleanText("  hello \n\n world\u0000 ", 40)).toBe("hello world");
    expect(cleanText("x".repeat(500), 120)?.length).toBe(120);
  });
  it("turns empty or non-strings into null", () => { expect(cleanText("   ", 10)).toBeNull(); expect(cleanText(42, 10)).toBeNull(); });
});

describe("sniffImage", () => {
  it("recognises jpeg, png and webp from the first bytes", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    expect(sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0]))).toBe("image/webp");
  });
  it("rejects svg, html and empty input even if the client says image/png", () => {
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("display helpers", () => {
  const base = { username: null, displayName: null, wallet: "0x1234567890abcdef1234567890abcdef12345678" };
  it("prefers display name, then @username, then a short wallet", () => {
    expect(nameFor({ ...base, displayName: "Amara" })).toBe("Amara");
    expect(nameFor({ ...base, username: "amara" })).toBe("@amara");
    expect(nameFor(base)).toBe("0x1234...5678");
  });
  it("builds a versioned avatar url only when there is a photo", () => {
    expect(avatarUrlFor({ id: "u1", hasAvatar: true, avatarVersion: 3 })).toBe("/api/avatar/u1?v=3");
    expect(avatarUrlFor({ id: "u1", hasAvatar: false, avatarVersion: 3 })).toBeNull();
  });
});

import { validateEmail } from "../src/profile";
describe("validateEmail", () => {
  it("accepts a normal address and lowercases it", () => { expect(validateEmail(" Ana@Example.com ")).toEqual({ ok: true, value: "ana@example.com" }); });
  it("rejects missing parts", () => { for (const v of ["", "ana", "ana@", "ana@example", "a b@example.com"]) expect(validateEmail(v).ok).toBe(false); });
});
