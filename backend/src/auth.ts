import { PrivyClient } from "@privy-io/server-auth";
import { getAddress } from "viem";
import { db, userCache } from "./db";

const USER_TTL_MS = 20_000;

let _privy: PrivyClient | null = null;
function privy() {
  if (!_privy) {
    const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID, secret = process.env.PRIVY_APP_SECRET;
    if (!id || !secret) throw new Error("Privy env vars missing");
    _privy = new PrivyClient(id, secret);
  }
  return _privy;
}

export class AuthError extends Error {}

/** Verifies the Privy access token and returns the app user (created on first sight), keyed privyUserId -> wallet. */
export async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new AuthError("Missing token");
  let userId: string;
  try {
    userId = (await privy().verifyAuthToken(token)).userId;
  } catch {
    throw new AuthError("Invalid token");
  }
  const hit = userCache.get(userId);
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.user;
  const existing = await db.user.findUnique({ where: { privyUserId: userId } });
  if (existing) {
    // Users created before email capture existed have none on record; fill it in the first time we see them again.
    const user = existing.email ? existing : await backfillEmail(userId, existing);
    userCache.set(userId, { at: Date.now(), user });
    return user;
  }
  const pu = await privy().getUser(userId);
  const wallet = pu.wallet?.address ?? pu.linkedAccounts.find((a) => a.type === "wallet")?.address;
  if (!wallet) throw new AuthError("No wallet linked");
  return db.user.create({ data: { privyUserId: userId, wallet: getAddress(wallet), email: pu.email?.address } });
}

async function backfillEmail(userId: string, existing: Awaited<ReturnType<typeof db.user.findUniqueOrThrow>>) {
  const email = (await privy().getUser(userId)).email?.address;
  if (!email) return existing;
  return db.user.update({ where: { id: existing.id }, data: { email } });
}

export function authFail(e: unknown) {
  if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 401 });
  console.error(e);
  return Response.json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500 });
}
