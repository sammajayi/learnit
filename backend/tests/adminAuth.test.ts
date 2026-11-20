import { describe, it, expect } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { requireAdmin, adminWallets, AdminAuthError } from "../src/adminAuth";
import { ADMIN_SESSION_MS, adminMessage } from "../src/adminMessage";

const admin = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
const NOW = 1_800_000_000_000;

async function req(account = admin, issued = NOW, overrides: Record<string, string> = {}) {
  const signature = await account.signMessage({ message: adminMessage(account.address, issued) });
  return new Request("http://x/api/admin/users", { headers: { "x-admin-address": account.address, "x-admin-issued": String(issued), "x-admin-signature": signature, ...overrides } });
}
const status = async (p: Promise<unknown>) => { try { await p; return 200; } catch (e) { return e instanceof AdminAuthError ? e.status : -1; } };

describe("requireAdmin", () => {
  it("lets an allowed wallet in with a fresh signature", async () => {
    expect(await requireAdmin(await req(), NOW, admin.address)).toBe(admin.address);
  });
  it("refuses everyone when no wallets are configured", async () => {
    expect(await status(requireAdmin(await req(), NOW, ""))).toBe(503);
    expect(await status(requireAdmin(await req(), NOW, "not-an-address"))).toBe(503);
  });
  it("refuses a request with no sign-in", async () => {
    expect(await status(requireAdmin(new Request("http://x"), NOW, admin.address))).toBe(401);
  });
  it("refuses a valid signature from a wallet that is not on the list", async () => {
    expect(await status(requireAdmin(await req(other), NOW, admin.address))).toBe(403);
  });
  it("refuses someone claiming the admin address with their own signature", async () => {
    const forged = await req(other, NOW, { "x-admin-address": admin.address });
    expect(await status(requireAdmin(forged, NOW, admin.address))).toBe(401);
  });
  it("refuses a sign-in older than the session", async () => {
    const old = NOW - ADMIN_SESSION_MS - 1;
    expect(await status(requireAdmin(await req(admin, old), NOW, admin.address))).toBe(401);
  });
  it("refuses a sign-in dated in the future", async () => {
    expect(await status(requireAdmin(await req(admin, NOW + 5 * 60_000), NOW, admin.address))).toBe(401);
  });
  it("refuses a signature reused with a different issue time", async () => {
    const r = await req(admin, NOW - 1000, { "x-admin-issued": String(NOW) });
    expect(await status(requireAdmin(r, NOW, admin.address))).toBe(401);
  });
  it("refuses a malformed signature", async () => {
    expect(await status(requireAdmin(await req(admin, NOW, { "x-admin-signature": "0x1234" }), NOW, admin.address))).toBe(401);
  });
  it("matches wallets whatever their letter case", async () => {
    expect(await requireAdmin(await req(), NOW, admin.address.toLowerCase())).toBe(admin.address);
  });
});

describe("adminWallets", () => {
  it("reads comma and space separated lists and skips junk", () => {
    expect(adminWallets(`${admin.address}, ${other.address.toLowerCase()}  nonsense`)).toEqual([admin.address, other.address]);
  });
  it("is empty when unset", () => expect(adminWallets("")).toEqual([]));
});
