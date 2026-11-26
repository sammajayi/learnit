import { getAddress, isAddress, verifyMessage } from "viem";
import { ADMIN_SESSION_MS, adminMessage } from "./adminMessage";

export class AdminAuthError extends Error {
  constructor(message: string, readonly status: 401 | 403 | 503) { super(message); }
}

/** The wallets allowed to open admin-only data, from ADMIN_WALLETS (comma or space separated). Anything that is not an address is ignored. */
export function adminWallets(raw: string | undefined = process.env.ADMIN_WALLETS): `0x${string}`[] {
  return (raw ?? "").split(/[\s,]+/).filter((a) => isAddress(a, { strict: false })).map((a) => getAddress(a));
}

/**
 * Admin-only requests carry a signed message: x-admin-address, x-admin-issued (ms) and x-admin-signature.
 * The wallet must prove it holds the key AND be on the allowlist. With no allowlist set, nothing is let through.
 */
export async function requireAdmin(req: Request, now: number = Date.now(), wallets: string | undefined = process.env.ADMIN_WALLETS): Promise<`0x${string}`> {
  const allowed = adminWallets(wallets);
  if (!allowed.length) throw new AdminAuthError("The admin list is not set up. Add ADMIN_WALLETS on the server.", 503);

  const addr = req.headers.get("x-admin-address") ?? "";
  const signature = req.headers.get("x-admin-signature") ?? "";
  const issued = Number(req.headers.get("x-admin-issued"));
  if (!isAddress(addr, { strict: false }) || !/^0x[0-9a-fA-F]+$/.test(signature) || !Number.isFinite(issued)) {
    throw new AdminAuthError("Sign in with your admin wallet.", 401);
  }
  const address = getAddress(addr);
  if (issued > now + 60_000 || now - issued > ADMIN_SESSION_MS) throw new AdminAuthError("Your sign-in has expired. Sign again.", 401);

  let ok = false;
  try { ok = await verifyMessage({ address, message: adminMessage(address, issued), signature: signature as `0x${string}` }); } catch { ok = false; }
  if (!ok) throw new AdminAuthError("That signature does not match this wallet.", 401);
  if (!allowed.includes(address)) throw new AdminAuthError("This wallet is not on the admin list.", 403);
  return address;
}

export function adminFail(e: unknown) {
  const headers = { "cache-control": "no-store" };
  if (e instanceof AdminAuthError) return Response.json({ error: e.message }, { status: e.status, headers });
  console.error(e);
  return Response.json({ error: "Something went wrong on our side. Try again in a moment." }, { status: 500, headers });
}
