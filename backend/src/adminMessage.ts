import { getAddress } from "viem";

/** How long a signed admin sign-in stays valid. */
export const ADMIN_SESSION_MS = 60 * 60_000;

/**
 * The text an admin wallet signs to open the user list. The server rebuilds it from the wallet and the issue time,
 * so the browser only sends those two values and the signature.
 */
export function adminMessage(address: string, issuedAt: number): string {
  return [
    "LearnIt admin access",
    `Wallet: ${getAddress(address)}`,
    `Issued: ${new Date(issuedAt).toISOString()}`,
    "Signing only lets this browser read the user list. It sends no transaction and costs nothing.",
  ].join("\n");
}
