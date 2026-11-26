// Sends the "vote for LearnIt" email. Run it from the backend folder.
//   npx tsx --env-file=../.env --env-file=.env scripts/send-vote-email.mts --to you@example.com      (one test, to that address only)
//   npx tsx --env-file=../.env --env-file=.env scripts/send-vote-email.mts --all                     (dry run: counts the verified users with an email, sends nothing)
//   npx tsx --env-file=../.env --env-file=.env scripts/send-vote-email.mts --all --send              (sends to the GoodDollar-verified users with an email)
// Anyone who was already sent this email (read from Resend's own sent log) is skipped, so it is safe to run again.
// Only GoodDollar-verified users are emailed: they are the ones who can vote. Each wallet is checked on-chain, so a wallet linked to a
// verified person counts too, even if that user has not opened the app lately.
// Needs RESEND_API_KEY. Resend allows about two requests a second. Addresses are never printed in full.
import { configureEmail, sendEmail, recipientsAlreadySent } from "../src/email";
import { voteEmail } from "../src/voteEmail";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
if (!configureEmail()) throw new Error("RESEND_API_KEY is not set");
const { subject, html } = voteEmail();

const to = arg("to");
if (to) {
  await sendEmail(to, subject, html);
  console.log(`Test sent to ${mask(to)}.`);
  process.exit(0);
}
if (!process.argv.includes("--all")) throw new Error("use --to <address> for a test, or --all");

const { db } = await import("../src/db");
const { readVerification } = await import("../src/identity");
const { isVerifiedNow } = await import("../src/verifiedGate");
const rows = await db.user.findMany({ where: { email: { not: null } }, select: { email: true, wallet: true } });
const withEmail = new Set(rows.map((r) => r.email!.trim().toLowerCase()).filter(Boolean)).size;
// Check the chain a few wallets at a time.
const verified: string[] = [];
for (let i = 0; i < rows.length; i += 5) {
  const chunk = rows.slice(i, i + 5);
  const checks = await Promise.all(chunk.map((r) => readVerification(r.wallet as `0x${string}`).then(isVerifiedNowOf).catch(() => false)));
  chunk.forEach((r, j) => { if (checks[j]) verified.push(r.email!.trim().toLowerCase()); });
}
function isVerifiedNowOf(v: Awaited<ReturnType<typeof readVerification>>) { return isVerifiedNow(v); }
const verifiedEmails = [...new Set(verified.filter(Boolean))];
const already = await recipientsAlreadySent(subject);
const emails = verifiedEmails.filter((e) => !already.has(e));
console.log(`${withEmail} user(s) have an email; ${verifiedEmails.length} are GoodDollar verified; ${verifiedEmails.length - emails.length} already got this email; ${emails.length} left to send.`);
if (!process.argv.includes("--send")) { console.log("Dry run. Add --send to email the ones left."); await db.$disconnect(); process.exit(0); }
let sent = 0, failed = 0;
for (const e of emails) {
  try { await sendEmail(e, subject, html); sent++; } catch (err) { failed++; console.error(mask(e), err instanceof Error ? err.message : err); }
  await pause(550);
}
console.log(`Sent ${sent}, failed ${failed}.`);
await db.$disconnect();
