"use client";
import { usePrivy } from "@privy-io/react-auth";

/** The one place that calls the auth provider's SDK. Every component goes through here instead of
 *  `usePrivy` directly, so adding or swapping a provider later is a change to this file alone. */
export function useAuth() {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  return { ready, authenticated, login, logout, getAccessToken, userId: user?.id ?? null };
}
