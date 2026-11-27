/**
 * Checks a Privy access token with the platform's WebCrypto, so it behaves the same on Node and on Cloudflare Workers.
 * (Privy's server library checks the signature through Node's crypto module, which Workers only partly provide.)
 * A token is valid when it is an ES256 JWT signed by one of the app's published keys, issued by privy.io for this app, and not expired.
 */
export type Jwk = { kty: string; crv: string; x: string; y: string; kid?: string };

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64(s))) as Record<string, unknown>;

/** Returns the Privy user id (the token's subject), or throws. `keys` returns the app's public keys. */
export async function verifyPrivyToken(token: string, appId: string, keys: () => Promise<Jwk[]>, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [h, p, s] = parts;
  const header = json(h);
  if (header.alg !== "ES256") throw new Error("unexpected algorithm");
  const jwk = (await keys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown signing key");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error("signature verification failed");
  const c = json(p);
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (c.iss !== "privy.io" || !aud.includes(appId)) throw new Error("wrong issuer or audience");
  if (typeof c.exp !== "number" || c.exp <= nowSec) throw new Error("token expired");
  if (typeof c.sub !== "string" || !c.sub) throw new Error("no subject");
  return c.sub;
}

let cached: { at: number; keys: Jwk[] } | null = null;
/** The app's public keys from Privy, kept for an hour. A token signed with a key we do not have yet triggers one refresh. */
export async function privyKeys(appId: string, force = false): Promise<Jwk[]> {
  if (!force && cached && Date.now() - cached.at < 3_600_000) return cached.keys;
  const r = await fetch(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`);
  if (!r.ok) throw new Error(`could not load Privy keys (${r.status})`);
  cached = { at: Date.now(), keys: ((await r.json()) as { keys: Jwk[] }).keys };
  return cached.keys;
}
