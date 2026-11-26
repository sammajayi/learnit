/** Referral links stay off until NEXT_PUBLIC_REFERRALS_ENABLED=true. */
export const REFERRALS_ENABLED = process.env.NEXT_PUBLIC_REFERRALS_ENABLED === "true";

export const REF_STORAGE_KEY = "learnit:referral";
export type StoredReferral = { ref?: string; source?: string };

/** The invite link for a code. Uses the public site when it is set, so links open the landing page. */
export const inviteLink = (code: string) => `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")}/?ref=${encodeURIComponent(code)}`;
