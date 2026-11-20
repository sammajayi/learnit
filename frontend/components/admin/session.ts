"use client";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { ADMIN_SESSION_MS, adminMessage } from "@learnit/backend/adminMessage";
import { friendlyError } from "@/lib/txErrors";

type Session = { address: `0x${string}`; issued: number; signature: `0x${string}` };
const keyFor = (a: string) => `learnit.admin.session.${a.toLowerCase()}`;
/** Ask again a little before the server would refuse, so a click never fails on a just-expired sign-in. */
const FRESH_MS = ADMIN_SESSION_MS - 5 * 60_000;

/**
 * A signed sign-in for admin-only data, held for this tab only (sessionStorage). The wallet signs a plain message:
 * no transaction, no cost. The server checks the signature and its own list of allowed wallets.
 * Disconnecting or switching wallet drops the sign-in and every cached person with it.
 */
export function useAdminSession() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null); setError(null);
    qc.removeQueries({ queryKey: ["admin", "users"] });
    if (!address) return;
    try {
      const raw = sessionStorage.getItem(keyFor(address));
      const s = raw ? (JSON.parse(raw) as Session) : null;
      if (s && Date.now() - s.issued < FRESH_MS) setSession(s);
    } catch { /* storage blocked: sign again */ }
  }, [address, qc]);

  const signIn = useCallback(async () => {
    if (!address) return;
    setError(null);
    const issued = Date.now();
    try {
      const signature = await signMessageAsync({ message: adminMessage(address, issued) });
      const s: Session = { address, issued, signature };
      setSession(s);
      try { sessionStorage.setItem(keyFor(address), JSON.stringify(s)); } catch { /* keep it in memory only */ }
    } catch (e) { setError(friendlyError(e)); }
  }, [address, signMessageAsync]);

  const signOut = useCallback(() => {
    if (address) { try { sessionStorage.removeItem(keyFor(address)); } catch { /* ignore */ } }
    setSession(null);
    qc.removeQueries({ queryKey: ["admin", "users"] });
  }, [address, qc]);

  const headers: Record<string, string> | null = session
    ? { "x-admin-address": session.address, "x-admin-issued": String(session.issued), "x-admin-signature": session.signature }
    : null;

  return { session, headers, signIn, signOut, signing: isPending, error };
}
