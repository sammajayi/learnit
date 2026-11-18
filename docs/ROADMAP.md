# LearnIt roadmap

Last updated: 10 November 2026. The GoodBuilders season ends in about three months (early February 2027), so every dated deliverable below lands by 31 January 2027.

## Direction

LearnIt makes language learning more fun and keeps people accountable to their goals. It is built on GoodDollar and Celo.

- **Fun first.** We are not trying to replace Duolingo and we do not model the product on it. New mechanics should feel like play, not like a copy of another app's formula.
- **Accountability.** The product is about showing up. Streaks, the weekly leaderboard and optional stake challenges help people keep a promise they made to themselves.
- **GoodDollar at the centre.** Verification gates every reward and stake, so each person counts once. Claimers get a daily reason to come back after they claim.
- **Honest by default.** The contracts are unaudited. Limits stay small and copy never promises more than the product does today.

## Where we are (6 November 2026)

Live in beta on Celo mainnet.

- French and Spanish, eight beginner units each, graded on the server.
- Daily UBI claim inside the app, then straight into a lesson.
- Daily streak with banked freezes, weekly and all-time leaderboards, daily reminders (PWA).
- Optional stake challenges of 7, 14 or 30 days on the upgradeable `StreakVault`. Our admin creates the challenges (start date, length and stake limits) and learners stake G$ on them.
- A length-based bonus is built into the contract: the admin sets a rate per length (7, 14, 30 days, up to 50% of the finishers' stake), paid to finishers on top of the shared missed stakes from a separately funded reserve. It is not a price-based bonding curve. The rates are 0 and the reserve is empty, so no bonus is paid yet.
- One Rewards menu with two tabs (Rewards and Stake), instead of two separate menu items.
- Chat page built with a coming-soon state: a text conversation with an AI partner in the language you are learning, which corrects mistakes inline and explains why. The AI is not connected yet.
- Public performance dashboard at `/admin` (totals only, no personal data). Actions are limited to the contract admin and guardian roles.
- Numbers: 5 users, 3 active this week, 2 GoodDollar-verified, 5 on-chain transactions, 493.88 G$ of UBI claimed through the app. No lesson reward has been claimed yet.

Known gaps to close first:

- The `StreakVault` UBI recipient is currently the signer wallet, not the GoodDollar UBI contract. Fix with `setUbiAddress` from the Safe, then update any copy that mentions the UBI share.
- Contracts are not audited.

## Milestones

### 1. Rewards live, UBI share fixed, contracts audit-ready

Take LearnIt from a working beta to a trusted one: pay the first real lesson rewards, send the share of missed stakes to the GoodDollar UBI contract, and get the contracts reviewed independently before limits are raised.

| Deliverable | Date |
|---|---|
| Rewards pool funded and the first lesson rewards claimed on-chain | 30 Nov 2026 |
| `StreakVault` UBI recipient set to the GoodDollar UBI contract and shown on Celoscan | 30 Nov 2026 |
| Public performance dashboard link shared with the GoodDollar team | 30 Nov 2026 |
| Independent audit of `RewardsPool` and `StreakVault` booked, with scope and auditor shared with the GoodDollar team | 15 Dec 2026 |

### 2. Accountability features for stake challenges

Make staying committed to a goal more fun: forgive one missed day, remember why you started, see who is still in, nudge people before a stake is lost, and offer an optional lives mode for people who want a bit more edge.

| Deliverable | Date |
|---|---|
| Mercy day: a banked streak freeze covers one missed lesson in a challenge | 12 Dec 2026 |
| Goal note: learners write why they are staking and see it again on hard days | 12 Dec 2026 |
| Still-in board: an anonymous live count and day-by-day progress of everyone in the challenge | 20 Dec 2026 |
| Evening reminder when a stake is at risk | 20 Dec 2026 |
| Optional lives mode: a limited number of lives per session that learners can switch on | 9 Jan 2027 |
| Length bonus switched on: bonus reserve funded and rates set for 14 and 30 day challenges, with the bonus shown before staking | 9 Jan 2027 |
| Two full challenge cycles run end to end, finalised and paid out on-chain | 24 Jan 2027 |

Design notes:

- The mercy day, goal note, still-in board and reminders are backend and UI changes only. No contract change is needed because the backend decides who finished.
- Lives mode is opt-in and per session. It must never make the default experience harsher.
- Keep the fun in progress and people, not in winnings. Missed stakes shared with finishers is gambling-adjacent in some places, so wording on this needs a legal read before launch.

### 3. Chat and voice practice with an AI tutor

Let learners talk with an AI partner in the language they are learning, so they practise real conversation and not only reading and tapping. It starts with text chat that corrects mistakes as you go, then adds voice, with short guided conversations tied to each unit.

| Deliverable | Date |
|---|---|
| Chat page built with a coming-soon state, where learners choose to type or speak | 6 Nov 2026 (done) |
| AI connected: text chat with inline corrections and a short reason for each, open to GoodDollar-verified learners (proposed date) | 18 Dec 2026 |
| Working prototype of voice: a speak and listen loop for French and Spanish, tested with at least 20 learners | 15 Jan 2027 |
| Safeguards in place: daily session limits, content filtering and no audio stored by default | 25 Jan 2027 |
| Voice practice in beta for all GoodDollar-verified learners | 31 Jan 2027 |

Open questions: cost per session and who pays for it, which speech and language models to use, and whether G$ can be used to unlock extra practice.

### 4. More lessons: the next level for French and Spanish

Extend both courses past the eight beginner units so learners who finish have somewhere to go, with content reviewed by native speakers.

| Deliverable | Date |
|---|---|
| First 2 A2 units published in French, reviewed by a native speaker | 24 Jan 2027 |
| First 2 A2 units published in Spanish, reviewed by a native speaker | 31 Jan 2027 |

## Targets for the season

Stated in the GoodBuilders application. Baseline is today's numbers.

| Target | Baseline | By the end of the season |
|---|---|---|
| Weekly retention | n/a at this size | 30% |
| Users earning G$ | 0 | 50 |
| G$ used inside the product | 100 | 5,000,000 |
| Communities or partners onboarded | 0 | 3 |
| GoodDollar-verified users | 2 | 800 |
| Active users | 3 | 1,000 |
| On-chain transactions | 5 | 20,000 |
| Revenue | 0 | 0 |

## Later, not committed

- Squads: stake together in a small group and share progress. Needs a contract change if payouts are shared.
- A true curve for the bonus (for example rising smoothly with length or with total staked). Today it is three admin-set rates.
- Retuning the bonus rates once the reserve is funded and the audit is done.
- A third language.
- A permanent "Get CELO" link on the profile page.
