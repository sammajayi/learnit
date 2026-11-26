import type { User } from "@prisma/client";
import { parseUnits } from "viem";
import { db } from "./db";
import { readVerificationCached } from "./identity";
import { issueVoucherFor } from "./vouchers";
import { isVerifiedNow } from "./verifiedGate";

/** The one-time welcome G$ for new learners. Off until NEXT_PUBLIC_WELCOME_ENABLED=true and WELCOME_FROM is set. */
export const welcomeEnabled = () => process.env.NEXT_PUBLIC_WELCOME_ENABLED === "true";
export const welcomeAmount = () => parseUnits(process.env.WELCOME_G || "800", 18);
/** Only accounts created on or after this moment count as new. Unset means nobody is eligible, so it can never pay existing learners by accident. */
export const welcomeFrom = () => {
  const v = process.env.WELCOME_FROM;
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

export type WelcomeWhy = "off" | "not_new" | "flagged" | "not_verified" | "no_lesson" | "claimed" | "not_set_up";

/** New, verified, has passed a lesson, not flagged, and has not had it before. */
export function welcomeEligibility(o: { createdAt: Date; from: Date | null; verified: boolean; passedLesson: boolean; claimed: boolean; flagged: boolean }): WelcomeWhy | null {
  if (!o.from) return "off";
  if (o.createdAt < o.from) return "not_new";
  if (o.flagged) return "flagged";
  if (!o.verified) return "not_verified";
  if (!o.passedLesson) return "no_lesson";
  if (o.claimed) return "claimed";
  return null;
}

/** One voucher per GoodDollar identity, whatever wallet or account they use: the voucher's source id is the identity root. */
const sourceOf = (root: string) => `welcome:${root.toLowerCase()}`;

async function check(user: User): Promise<{ why: WelcomeWhy | null; root: `0x${string}` | null }> {
  if (!welcomeEnabled()) return { why: "off", root: null };
  const v = await readVerificationCached(user.wallet as `0x${string}`);
  const verified = isVerifiedNow(v) && !!v.root;
  const [passed, existing] = await Promise.all([
    db.lessonAttempt.findFirst({ where: { userId: user.id, passed: true }, select: { id: true } }),
    v.root ? db.voucher.findUnique({ where: { sourceId: sourceOf(v.root) }, select: { id: true } }) : Promise.resolve(null),
  ]);
  const why = welcomeEligibility({ createdAt: user.createdAt, from: welcomeFrom(), verified, passedLesson: !!passed, claimed: !!existing, flagged: user.flagged });
  return { why, root: v.root };
}

export async function welcomeStatus(user: User) {
  const { why } = await check(user);
  return { eligible: why === null, why, amount: welcomeAmount().toString() };
}

/** Signs the one-time welcome voucher. The learner then claims it on the Rewards page like any other voucher. */
export async function claimWelcome(user: User) {
  const { why, root } = await check(user);
  if (why || !root) return { ok: false as const, why: why ?? ("not_verified" as const) };
  try {
    const v = await issueVoucherFor(root, welcomeAmount(), "welcome", sourceOf(root));
    if (!v) return { ok: false as const, why: "not_set_up" as const };
    return { ok: true as const, voucherId: v.id };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false as const, why: "claimed" as const };
    throw e;
  }
}
