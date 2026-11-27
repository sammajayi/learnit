# Biweekly contest

How the contest works and how it is calculated. The rules live in `backend/src/contestRules.ts` and `backend/src/contest.ts`; change them there and update this page.

## The rules today

- **Two weeks, back to back.** A contest is 14 days. The first starts on `CONTEST_START` (a Monday, UTC) and every contest after it starts 14 days later.
- **Verified people only.** Only people with a valid GoodDollar verification (or a daily claim, which needs one) are on the board. Unverified people see a prompt to verify.
- **Show up every day.** You stay in the prize race only while you have passed at least one lesson or checkpoint on every closed day of the contest. Miss one and you are out of the prize race for that contest. Your points still count on Overall.
- **Top 10 share the pool.** The ten highest-ranked people still in the race win a share of the pool. Shares, rank 1 first: 25, 18, 14, 11, 9, 7, 6, 5, 3, 2 percent.
- **Leaderboard tabs:** "Two weeks" is this contest. "Overall" is the all-time board. The old weekly group board is replaced.

## How it is calculated

- **Points** are the same as the other boards: for each lesson or checkpoint, its best score in the window counts once, worth 10 (lesson) or 30 (checkpoint) scaled by accuracy, never below 1. Only attempts inside the 14 days count.
- **A day** is the day on the learner's own clock (the same day their streak uses), taken from each passed attempt's local date.
- **A missed day** is only counted once the date is closed everywhere: two UTC days behind. People are in different timezones, so a day ends at different moments for them. This means someone shows as "out" about a day later than they actually missed.
- **Ranking:** people still in the race are ranked 1, 2, 3... by points, then by days shown up, then by id so ties never flip. People who missed a day come after, with no rank.
- **Prizes:** `prizeAmounts(pool)` splits `CONTEST_POOL_G` by the shares, rounded down to 2 decimals, so the total never exceeds the pool.

## Settings

| Setting | What it does | Default |
|---|---|---|
| `CONTEST_START` | First day of the first contest, `YYYY-MM-DD` (a Monday) | `2026-11-30` |
| `CONTEST_POOL_G` | Total G$ to share per contest | not set (prizes show as "to be announced") |
| `CONTEST_SHARES` | Ten comma-separated percentages, rank 1 first | `25,18,14,11,9,7,6,5,3,2` |

## Paying the winners

After a contest has ended and its last day has closed, run from `backend/`:

```
npx tsx --env-file=../.env scripts/finalize-contest.mts                      # dry run, the contest that just ended
npx tsx --env-file=../.env scripts/finalize-contest.mts --start 2026-11-30   # dry run for one contest
npx tsx --env-file=../.env scripts/finalize-contest.mts --start 2026-11-30 --send
```

Winners are checked on-chain at that moment (a winner who is no longer verified, or is flagged, is skipped and the next person moves up). Prizes are paid as reward-pool vouchers, one per person per contest, so running it twice never pays twice.

**Voucher caps.** The rewards pool limits one person to 950 G$ a day and 1,400 G$ a week. A prize above the daily cap is capped on the voucher and the rest is listed for you to pay by hand. If the pool is large (for example $50 worth of G$), most prizes will be above the cap. Decide how to pay: raise the pool's caps for the contest, or send the G$ directly.

## Open questions

- Is "every single day" the right rule? In a trial over 2026-11-18 to 2026-12-01 (14 days), nobody showed up on all 14 days; the best was 9. A softer rule (for example, allow one missed day, or let a streak freeze cover a day) would leave real winners.
- What happens to the weekly group league payouts (top 3 per group)? The weekly board is replaced in the app, but the weekly payout cron is untouched.
