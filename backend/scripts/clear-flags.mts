// Clears the abuse flags on accounts you have checked and know are real: marks their flags resolved and removes the "flagged" mark.
//   npx tsx --env-file=../.env scripts/clear-flags.mts just_devan verabloom            (dry run: shows what would change)
//   npx tsx --env-file=../.env scripts/clear-flags.mts just_devan verabloom --apply    (clears them)
// Run it from the backend folder. A flag only marks an account for review and never blocks learning, but a flagged winner is skipped
// in the weekly league payout, so clearing it also lets them be paid again.
import { db } from "../src/db";

const apply = process.argv.includes("--apply");
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!names.length) throw new Error("give one or more usernames");

for (const name of names) {
  const user = await db.user.findUnique({ where: { username: name.toLowerCase() }, select: { id: true, flagged: true } });
  if (!user) { console.log(`@${name}: no such user`); continue; }
  const open = await db.abuseFlag.count({ where: { userId: user.id, resolved: false } });
  console.log(`@${name}: flagged=${user.flagged}, ${open} open flag(s)${apply ? "" : " (dry run)"}`);
  if (!apply) continue;
  await db.$transaction([
    db.abuseFlag.updateMany({ where: { userId: user.id, resolved: false }, data: { resolved: true } }),
    db.user.update({ where: { id: user.id }, data: { flagged: false } }),
  ]);
  console.log(`  cleared.`);
}
await db.$disconnect();
