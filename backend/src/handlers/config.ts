import { ADDR } from "../chain";

/** The contract addresses this server signs rewards for and indexes stakes against. The app reads them from here
 *  instead of from its own build, so it can never disagree with the server about where a reward is claimed or a
 *  stake is made. Public on purpose: the addresses are on-chain anyway. */
export async function GET() {
  return Response.json(
    { rewardsPool: ADDR.rewardsPool || null, streakVault: ADDR.streakVault || null },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
