import { describe, it, expect, vi, afterEach } from "vitest";

const POOL = "0x1111111111111111111111111111111111111111";
const VAULT = "0x2222222222222222222222222222222222222222";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function config() {
  vi.resetModules();
  const { GET } = await import("../src/handlers/config");
  const res = await GET();
  return { body: await res.json(), cache: res.headers.get("Cache-Control") };
}

describe("GET /api/config", () => {
  it("returns the addresses the server itself uses", async () => {
    vi.stubEnv("NEXT_PUBLIC_REWARDS_POOL_ADDRESS", POOL);
    vi.stubEnv("NEXT_PUBLIC_STREAK_VAULT_ADDRESS", VAULT);
    const { body } = await config();
    expect(body).toEqual({ rewardsPool: POOL, streakVault: VAULT });
  });
  it("says null, not an empty string, for an address that is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_REWARDS_POOL_ADDRESS", POOL);
    vi.stubEnv("NEXT_PUBLIC_STREAK_VAULT_ADDRESS", "");
    const { body } = await config();
    expect(body).toEqual({ rewardsPool: POOL, streakVault: null });
  });
  it("can be cached briefly, since the addresses rarely change", async () => {
    vi.stubEnv("NEXT_PUBLIC_REWARDS_POOL_ADDRESS", POOL);
    const { cache } = await config();
    expect(cache).toContain("max-age=60");
  });
});
