import { avatarUrlFor } from "./profile";

/**
 * One person as the public Members page shows them. Public on purpose, so it holds nothing personal: no wallet, no email,
 * no flag, no claim or learning-time counts, no last-active time. Those stay on the admin table (see handlers/adminUsers.ts).
 */
export type PublicMember = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  course: string;
  verified: boolean;
  lessonsPassed: number;
  joined: string;
};

type MemberSource = {
  id: string; username: string | null; displayName: string | null; hasAvatar: boolean; avatarVersion: number;
  course: string; verifiedUntil: Date | null; createdAt: Date;
};

/** Only people who have chosen a username are listed. Anyone without one is left out. */
export function toPublicMember(u: MemberSource, lessonsPassed: number, now = Date.now()): PublicMember | null {
  if (!u.username) return null;
  return {
    username: u.username,
    displayName: u.displayName,
    avatarUrl: avatarUrlFor(u),
    course: u.course,
    verified: !!u.verifiedUntil && u.verifiedUntil.getTime() > now,
    lessonsPassed,
    joined: u.createdAt.toISOString(),
  };
}
