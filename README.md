# LearnIt (beta)

Learn French or Spanish in short daily lessons and earn small G$ rewards for real progress. Built on [GoodDollar](https://docs.gooddollar.org) and Celo.

> **Beta.** The smart contracts are unaudited. Caps and stake limits are tiny on purpose. Do not put in money you cannot lose.

## What it does

1. **Sign in** with Privy: email (gets an embedded wallet) or connect a wallet such as GoodWallet.
2. **Onboard**: pick French or Spanish, see how it works.
3. **Verify** with GoodDollar face verification. Anyone can do lessons for free; only verified users can claim, earn or stake.
4. **Claim your daily G$ UBI** on the home screen, then go straight to today's lesson.
5. **Do a lesson** (6 questions: multiple choice, translate by picking words, match pairs). Each theme is split into two short parts. Grading is server-side. Pass at 80% accuracy and 40 seconds or more.
6. **Earn**: a pass returns a signed EIP-712 voucher you redeem on the `RewardsPool` contract (max 3 lessons a day, plus a first-time checkpoint pass). Suspicious patterns (boundary-timed perfect scores, inhuman pace) hold the reward for review instead of issuing it.
7. **Stake** G$ on a 7-day streak challenge with `StreakVault`. Finishers get their stake back plus a share of forfeits.
8. **Keep your streak**: miss a day and it resets, unless you've banked a freeze (earned automatically every 7-day milestone, capped at 2) to auto-cover one missed day.
9. **League**: passing a lesson or checkpoint puts you in this week's ~30-person group. Points: 10 per distinct lesson passed, 30 per checkpoint. Top 3 in your group split a G$ bonus when the week ends.

Full product spec: [`docs/LearnIt-PRD-v0.2.docx`](docs/LearnIt-PRD-v0.2.docx).

## Repository layout

```
frontend/    Next.js 14 app (App Router, Tailwind, PWA). Pages, components, client hooks.
             app/api/* are thin route files that re-export handlers from the backend.
backend/     Server logic as a workspace package (@learnit/backend):
               src/handlers/   one file per API endpoint
               src/             auth, grading, streaks, vouchers, cohorts, leagues, abuse checks, identity, Prisma client
               src/content/     lesson JSON and its typed schema (fr, es)
               prisma/          database schema
               scripts/         content generator, cohort finaliser, league finaliser, Neon check
               tests/           vitest
contracts/   Foundry project: RewardsPool, StreakVault, tests, deploy scripts
docs/        PRD
neon.ts      Neon project config (Postgres + a sample function)
.env         one shared env file at the repo root (never committed)
```

The backend still deploys with the frontend: Next.js route handlers call into `@learnit/backend`, so there is a single Vercel deployment and no separate server to run.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript), Tailwind, installable PWA, Vercel |
| Auth and wallet | Privy with wagmi and viem on Celo (chainId 42220) |
| Backend | Route handlers in `@learnit/backend`, Privy access token checked on every route |
| Database | Neon Postgres via Prisma (pooled URL for the app, direct URL for schema pushes) |
| Contracts | Solidity 0.8.x, Foundry, OpenZeppelin |
| Identity and UBI | `@goodsdks/citizen-sdk`, GoodDollar Identity contract on Celo |

Design: deep navy on a warm off-white, sage for progress, muted coral for the main action. Inter type, Lucide icons. Mobile first, with a sidebar layout on desktop. Tokens live in `frontend/app/globals.css`, shared UI pieces in `frontend/components/ui`.

## Setup

Requirements: Node 20+, npm, [Foundry](https://book.getfoundry.sh/getting-started/installation), a Postgres database (Neon free plan works), a Privy app.

```bash
git clone --recurse-submodules https://github.com/sammajayi/learnit.git
cd learnit
npm install
cp .env.example .env     # then fill in the values below
npm run db:push          # create tables
npm run dev              # http://localhost:3000
```

Useful commands (from the repo root):

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Run the frontend |
| `npm run check` | Type-check backend and frontend |
| `npm test` | Backend tests (grading, streaks) |
| `npm run test:contracts` | Foundry tests |
| `npm run db:push` | Push the Prisma schema (uses the direct Neon URL) |
| `npm run content` | Regenerate lesson JSON from `backend/scripts/vocab.ts` |
| `npm run neon:check -w @learnit/backend` | Write and read back a row in every table |

If `db:push` fails with "Can't reach database server", the database is waking up or the link is slow. Add `&connect_timeout=60` to `DATABASE_URL_UNPOOLED` and retry.

### Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string (schema pushes) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app id (public) |
| `PRIVY_APP_SECRET` | Privy app secret (server only) |
| `APP_SECRET` | Random string used to sign lesson start tokens |
| `SIGNER_PRIVATE_KEY` | Key that signs reward vouchers and marks finishers. Server only. Never commit it |
| `LESSON_REWARD_G`, `CHECKPOINT_REWARD_G`, `DAILY_CAP_G` | Reward sizes in G$. Keep `DAILY_CAP_G` equal to the pool's `dailyCap` |
| `VAULT_DEPLOY_BLOCK` | Block the `StreakVault` was deployed at (for reading Staked events) |
| `LEAGUE_BONUS_1_G`, `LEAGUE_BONUS_2_G`, `LEAGUE_BONUS_3_G` | Weekly league bonus for rank 1, 2, 3 in a group (G$). Each is capped at `DAILY_CAP_G`, because a voucher cannot be split across days |
| `NEXT_PUBLIC_NETWORK` | `mainnet` (default) or `testnet` (Celo Alfajores) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push keys for daily reminders. Generate with `npx web-push generate-vapid-keys`. The subject is a URL you control, not a personal email |
| `CRON_SECRET` | Random string. The reminder workflow sends it as a bearer token to `/api/cron/reminders` |
| `NEXT_PUBLIC_CELO_RPC_URL` | Celo RPC endpoint |
| `NEXT_PUBLIC_REWARDS_POOL_ADDRESS`, `NEXT_PUBLIC_STREAK_VAULT_ADDRESS` | Deployed contracts |
| `NEXT_PUBLIC_GOODDOLLAR_TOKEN_ADDRESS`, `NEXT_PUBLIC_IDENTITY_ADDRESS`, `NEXT_PUBLIC_UBI_SCHEME_ADDRESS` | G$, GoodDollar Identity and the UBI scheme (defaults are Celo mainnet; required with no default on testnet) |
| `NEXT_PUBLIC_GOODDOLLAR_SDK_ENV` | citizen-sdk's `env` option. Defaults to `production` on mainnet, `staging` on testnet |

Never commit `.env`. Only `.env.example` is tracked. Privy: enable **Email** login and add your local and production URLs as allowed origins.

### Testnet

Setting `NEXT_PUBLIC_NETWORK=testnet` switches the app to Celo Alfajores: `useGoodSdk`, wagmi/Privy's chain config, and all on-chain reads point at Alfajores, and `GOODDOLLAR_SDK_ENV` defaults to `staging` for citizen-sdk. This repo does not guess GoodDollar's dev contract addresses (they change), so on testnet you must set `NEXT_PUBLIC_IDENTITY_ADDRESS`, `NEXT_PUBLIC_GOODDOLLAR_TOKEN_ADDRESS` and `NEXT_PUBLIC_UBI_SCHEME_ADDRESS` yourself from [GoodDollar's docs](https://docs.gooddollar.org), and deploy `RewardsPool`/`StreakVault` with `DeployTestnetUpgradeable.s.sol`'s `DEV_IDENTITY`. If `staging` turns out not to match what your installed `@goodsdks/citizen-sdk` version expects, override it with `NEXT_PUBLIC_GOODDOLLAR_SDK_ENV`.

### Contracts

```bash
cd contracts
forge build
forge test
```

Both contracts are UUPS upgradeable (OpenZeppelin `contracts-upgradeable`). Upgrade authority is `DEFAULT_ADMIN_ROLE` directly, no timelock - a deliberate tradeoff since `ADMIN` is meant to be a Safe multisig: one compromised Safe signer could replace either contract's entire logic instantly, so keep the Safe's threshold and signer hygiene accordingly.

Deploy (Celo testnet with dev G$, or mainnet with tiny caps):

```bash
export DEPLOYER_PRIVATE_KEY=... ADMIN=0x... GUARDIAN=0x... SIGNER=0x... UBI_ADDRESS=0x...
forge script script/DeployTestnetUpgradeable.s.sol --rpc-url $CELO_TESTNET_RPC_URL --broadcast   # also needs DEV_IDENTITY
forge script script/DeployMainnetUpgradeable.s.sol --rpc-url $CELO_RPC_URL --broadcast --verify
```

`initialize()` grants `ADMIN`/`GUARDIAN` directly - the deployer never holds admin at any point, unlike a typical constructor-based deploy. Then fund the pool (`approve` + `deposit`), call `createCohort(start, lengthDays, min, max)` as admin (`lengthDays` is 7, 14 or 30), and put the printed proxy addresses in `.env`. `ADMIN` and `GUARDIAN` should be a Safe multisig on mainnet.

`RewardsPool` pays EIP-712 vouchers with daily and weekly caps per whitelisted root and a global daily budget. `StreakVault` runs 7, 14 or 30-day cohorts (admin picks per cohort); the signer marks finishers and confirms the results (`finalizeResults`), then 70% of forfeits go to finishers, 20% to the pool, 10% to the UBI address, plus an optional admin-tunable length bonus (`setBonusBps`, paid from a separately funded `fundBonusReserve`). The split and the bonus rate are locked per cohort when it is created, so `setSplit` and `setBonusBps` only affect later cohorts. Fund the bonus reserve before opening a cohort that has a bonus: each stake sets its own bonus aside, and a stake is refused if the reserve cannot back it. G$ transfer fees are handled by recording the amount actually received.

## Operations

- **Finalise a stake cohort** after it ends: `npm run cohort:finalize -w @learnit/backend -- <id>` prints who finished all 7, 14 or 30 days (dry run). Add `--send` to call `markFinished`, `finalizeResults`, `settle` and `distribute` with the signer key. Nobody can settle before `finalizeResults` confirms the results, and the script is safe to run again if it stops part-way. Do this within 7 days of the end: after that anyone can call `voidCohort`, which cancels the challenge and lets every staker take their own stake back.
- **Legacy contracts**: the original non-upgradeable `RewardsPool`/`StreakVault` (source removed from this repo) are still deployed and will exist on-chain forever - `RewardsPool` at `0x9267a8D2ee7b4B16707Ad0A8B66d549065127c23` (drained, 0 G$, not referenced by any env var) and `StreakVault` at `0x95751E6b79E4f0d715Cc590C7aFfF48566CD9f33`. The vault has one cohort still owed a finalize: cohort 2, 100 G$ staked, ends 2026-11-12 16:12 UTC. Once it has, run `cohort:finalize` against that address specifically (temporarily override `NEXT_PUBLIC_STREAK_VAULT_ADDRESS` to the legacy address for that one call) rather than the current upgradeable vault. Do it within one day of the end (before 2026-11-13 16:12 UTC): the legacy vault cannot be upgraded, so after that anyone can settle it with whatever is marked, and an unmarked finisher loses the stake. The script detects the old vault and uses its `markFinished` then `settle` flow.
- **Finalise a league week** after it ends: `npm run league:finalize -w @learnit/backend -- <weekKey>` prints each group's top 3 (dry run); `weekKey` is the Monday the week started (e.g. `2026-10-27`), defaults to last week. Add `--send` to sign and record bonus vouchers.
- **Review flagged accounts**: rows in `abuse_flags` (reason `boundary-timed-perfect-streak` or `high-velocity`) mark a reward that was withheld pending review; nothing is automated beyond withholding the voucher, so check `AbuseFlag`/`User.flagged` manually (e.g. via `db:studio`) before deciding whether to pay it out some other way.
- **Daily reminders:** `.github/workflows/reminders.yml` calls `/api/cron/reminders` every hour with `Authorization: Bearer $CRON_SECRET` (Vercel Hobby only allows daily crons, so GitHub Actions does the scheduling for free). In the GitHub repo add two Actions secrets: `APP_URL` (your deployed URL, e.g. `https://learnit.vercel.app`) and `CRON_SECRET` (same value as in Vercel). Run it by hand from the Actions tab to test. Locally: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reminders`.
- **Known MVP limits:** lesson answers are checked one at a time for instant feedback, so a determined user could probe answers; the 80% and 40-second rules, the per-lesson daily reward limit, the anomaly checks and the pool's caps bound the damage. The signer key lives in an env var; move it to a KMS before raising limits.

## Contributing

Contributions are welcome, especially lesson content reviews by native French and Spanish speakers.

1. Fork the repo and create a branch: `git checkout -b feat/short-name`.
2. Keep changes small and focused. One idea per pull request.
3. Run `npm run check` and `npm test` (and `npm run test:contracts` if you touched contracts) before pushing.
4. Open a pull request that says what changed and why. Add screenshots for UI changes.

Ground rules:

- **No secrets** in commits, issues or screenshots.
- **Grading stays on the server.** The client never decides pass or fail.
- **Contracts:** every state change emits an event, and changes need Foundry tests (fuzz where there is math).
- **Design:** use the tokens in `frontend/app/globals.css` (navy, warm off-white, sage, coral) and the pieces in `frontend/components/ui`. White text only on `coral-600` or darker. One icon set (Lucide). Respect `prefers-reduced-motion`.
- **Copy:** plain and short. No em dashes.
- **Lesson content:** follow the typed schema in `backend/src/content/schema.ts`. Spanish is Latin American Spanish. Native-speaker review is required before merge.
- **Pronunciation audio:** every spoken phrase has a recording in `frontend/public/audio`, so it sounds the same on every device. After changing lesson content, run `uv run --with piper-tts --with lameenc backend/scripts/build-audio.py` from the repo root and commit the new files. It records only the phrases that have no file yet and removes the ones no longer used. A phrase without a recording falls back to the browser voice, which many devices do not have.

Found a security issue in the contracts or voucher flow? Please do not open a public issue. Email the maintainer instead.

## License

[MIT](LICENSE)

Pronunciation recordings are made with [Piper](https://github.com/rhasspy/piper). Spanish voice: `es_MX-claude-high` (Apache-2.0). French voice: `fr_FR-siwis-medium`, trained on the SIWIS French Speech Synthesis Database (CC BY 4.0).
