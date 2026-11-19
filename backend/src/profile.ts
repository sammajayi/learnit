export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const BIO_MAX = 120;
export const NAME_MAX = 40;
export const MAX_AVATAR_BYTES = 200_000;

const RESERVED = new Set(["admin", "administrator", "root", "support", "help", "learnit", "gooddollar", "goodDollar".toLowerCase(), "moderator", "mod", "staff", "team", "official", "system", "null", "undefined", "api", "me", "you"]);

export type UsernameCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Usernames are stored lowercase: letters, digits and underscores, starting with a letter. */
export function validateUsername(raw: string): UsernameCheck {
  const value = raw.trim().toLowerCase();
  if (value.length < USERNAME_MIN) return { ok: false, reason: `Use at least ${USERNAME_MIN} characters` };
  if (value.length > USERNAME_MAX) return { ok: false, reason: `Use ${USERNAME_MAX} characters or fewer` };
  if (!/^[a-z]/.test(value)) return { ok: false, reason: "Start with a letter" };
  if (!/^[a-z0-9_]+$/.test(value)) return { ok: false, reason: "Use only letters, numbers and underscores" };
  if (RESERVED.has(value)) return { ok: false, reason: "That username is not available" };
  return { ok: true, value };
}

/** Trims, collapses whitespace and strips control characters. Empty becomes null. */
export function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t.length ? t : null;
}

/** Identifies an image by its first bytes instead of trusting the client's content type. SVG is deliberately not allowed. */
export function sniffImage(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export const avatarUrlFor = (u: { id: string; hasAvatar: boolean; avatarVersion: number }) => (u.hasAvatar ? `/api/avatar/${u.id}?v=${u.avatarVersion}` : null);

/** What to show for a person: display name, then @username, then a short wallet. */
export function nameFor(u: { username: string | null; displayName: string | null; wallet: string }) {
  return u.displayName || (u.username ? `@${u.username}` : `${u.wallet.slice(0, 6)}...${u.wallet.slice(-4)}`);
}
