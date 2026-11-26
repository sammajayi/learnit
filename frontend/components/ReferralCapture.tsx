"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/lib/useApi";
import { REFERRALS_ENABLED, REF_STORAGE_KEY, type StoredReferral } from "@/lib/referral";

/**
 * Remembers the invite code (?ref=) and community tag (?c=) a visitor arrived with, and sends them once after sign-in.
 * Does nothing unless referrals are switched on.
 */
export function ReferralCapture() {
  const { ready, authenticated } = useAuth();
  const api = useApi();

  useEffect(() => {
    if (!REFERRALS_ENABLED) return;
    try {
      const q = new URLSearchParams(window.location.search);
      const ref = q.get("ref") ?? undefined, source = q.get("c") ?? undefined;
      if (ref || source) {
        // Merge into what is already saved, so a later link with only a community tag does not wipe an invite code.
        let prev: StoredReferral = {};
        try { prev = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) ?? "{}") ?? {}; } catch { /* start fresh */ }
        const next: StoredReferral = { ref: ref ?? prev.ref, source: source ?? prev.source };
        localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(next));
      }
    } catch { /* storage can be blocked; the link then simply does not count */ }
  }, []);

  useEffect(() => {
    if (!REFERRALS_ENABLED || !ready || !authenticated) return;
    let stored: StoredReferral | null = null;
    try { stored = JSON.parse(localStorage.getItem(REF_STORAGE_KEY) ?? "null"); } catch { /* ignore */ }
    if (!stored || (!stored.ref && !stored.source)) return;
    // Cleared once the server has answered (counted, already recorded, account too old: asking again gives the same answer).
    // If the request fails, the code stays saved and is sent again on the next visit.
    api("/api/referral", { method: "POST", body: JSON.stringify(stored) })
      .then(() => { try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* ignore */ } })
      .catch(() => {});
  }, [ready, authenticated, api]);

  return null;
}
