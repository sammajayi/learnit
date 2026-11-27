import { describe, expect, it } from "vitest";
import { verifyPrivyToken, type Jwk } from "../src/privyToken";

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const APP = "app123";
const NOW = 1_800_000_000;

async function setup() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = (await crypto.subtle.exportKey("jwk", kp.publicKey)) as Jwk;
  const jwk: Jwk = { ...pub, kid: "k1" };
  async function sign(claims: Record<string, unknown>, header: Record<string, unknown> = { alg: "ES256", typ: "JWT", kid: "k1" }) {
    const input = `${enc(header)}.${enc(claims)}`;
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(sig).toString("base64url")}`;
  }
  return { jwk, sign };
}
const good = { iss: "privy.io", aud: APP, sub: "did:privy:abc", exp: NOW + 60 };

describe("verifyPrivyToken", () => {
  it("accepts a valid token and returns the user id", async () => {
    const { jwk, sign } = await setup();
    expect(await verifyPrivyToken(await sign(good), APP, async () => [jwk], NOW)).toBe("did:privy:abc");
  });
  it("rejects a token signed by another key", async () => {
    const a = await setup(), b = await setup();
    await expect(verifyPrivyToken(await a.sign(good), APP, async () => [b.jwk], NOW)).rejects.toThrow("signature");
  });
  it("rejects a tampered payload", async () => {
    const { jwk, sign } = await setup();
    const [h, , s] = (await sign(good)).split(".");
    await expect(verifyPrivyToken(`${h}.${enc({ ...good, sub: "did:privy:other" })}.${s}`, APP, async () => [jwk], NOW)).rejects.toThrow("signature");
  });
  it("rejects an expired token, a wrong audience and a wrong issuer", async () => {
    const { jwk, sign } = await setup();
    await expect(verifyPrivyToken(await sign({ ...good, exp: NOW - 1 }), APP, async () => [jwk], NOW)).rejects.toThrow("expired");
    await expect(verifyPrivyToken(await sign({ ...good, aud: "other" }), APP, async () => [jwk], NOW)).rejects.toThrow("audience");
    await expect(verifyPrivyToken(await sign({ ...good, iss: "evil.io" }), APP, async () => [jwk], NOW)).rejects.toThrow("audience");
  });
  it("rejects other algorithms, unknown keys and junk", async () => {
    const { jwk, sign } = await setup();
    await expect(verifyPrivyToken(await sign(good, { alg: "none", kid: "k1" }), APP, async () => [jwk], NOW)).rejects.toThrow("algorithm");
    await expect(verifyPrivyToken(await sign(good, { alg: "ES256", kid: "zzz" }), APP, async () => [jwk], NOW)).rejects.toThrow("key");
    await expect(verifyPrivyToken("not-a-token", APP, async () => [jwk], NOW)).rejects.toThrow("malformed");
  });
});
