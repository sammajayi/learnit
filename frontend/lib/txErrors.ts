import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { CELO_HELP_URL } from "./links";

const MESSAGES: Record<string, string> = {
  // RewardsPool
  NotVerified: "Your GoodDollar verification is missing or has expired. Verify again, then try once more.",
  WrongRoot: "This reward belongs to a different GoodDollar identity.",
  Expired: "This reward has expired and can no longer be claimed.",
  NonceUsed: "This reward was already claimed, maybe on another device.",
  BadSignature: "This reward is no longer valid.",
  DailyCapExceeded: "You have reached today's reward limit. Try again tomorrow.",
  WeeklyCapExceeded: "You have reached this week's reward limit. Try again next week.",
  BudgetExceeded: "Today's reward budget has run out. Try again tomorrow.",
  ZeroAmount: "This reward has no amount.",
  LengthMismatch: "Something went wrong with that batch. Claim them one at a time.",
  EnforcedPause: "This is paused for now. Please try again later.",
  // StreakVault
  VerificationEndsBeforeCohort: "Your verification expires before this challenge ends. Renew it with GoodDollar, then join.",
  JoinClosed: "The join window for this challenge has closed. Join the next one.",
  AlreadyStaked: "You have already staked in this challenge.",
  OutOfBounds: "That amount is outside the allowed stake range.",
  BadParams: "That request was not valid.",
  NotSettled: "This challenge has not been settled yet.",
  NotStaked: "You did not stake in this challenge.",
  NotFinisher: "Only people who finished every day can withdraw.",
  AlreadyWithdrawn: "You have already withdrawn.",
  IsVoided: "This challenge was already cancelled. Everyone who joined can take their stake back.",
  CannotVoidYet: "This challenge cannot be cancelled yet. That opens 7 days after it ends, if the results are still not confirmed.",
  ResultsAlreadyFinal: "The results of this challenge are already confirmed, so it can no longer be changed or cancelled.",
  ResultsNotFinal: "The results of this challenge are not confirmed yet, so it cannot be settled.",
  AlreadySettled: "This challenge is already settled.",
  NotEnded: "This challenge has not ended yet.",
  // Admin
  AccessControlUnauthorizedAccount: "This wallet does not have permission to do that. Connect the admin wallet.",
  ExpectedPause: "Staking is not paused.",
  UnsupportedLength: "Challenges can only run 7, 14 or 30 days.",
  InsufficientBonusReserve: "This challenge cannot take new stakes right now, because its bonus is not fully funded yet. Nothing was taken from your wallet. Please try again later.",
  BonusCapExceeded: "That bonus rate is above the 50% cap.",
};

/** Turns wallet and contract failures into a sentence a person can act on. */
export function friendlyError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You cancelled the request in your wallet. Nothing was sent.";
    const rev = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = rev?.data?.errorName;
    if (name && MESSAGES[name]) return MESSAGES[name];
    if (/insufficient funds|exceeds the balance/i.test(e.shortMessage)) return `Not enough CELO to pay the network fee. Get more in our Telegram group: ${CELO_HELP_URL}`;
    if (/allowance/i.test(e.shortMessage)) return "G$ spending was not approved. Try again and approve when your wallet asks.";
    if (/transfer amount exceeds balance|insufficient balance/i.test(e.shortMessage)) return "You do not have enough G$ for that amount.";
    return "We could not complete that. Nothing was sent. Try again in a moment.";
  }
  const code = (e as { code?: number } | null)?.code;
  if (code === 4001) return "You cancelled the request in your wallet. Nothing was sent.";
  return e instanceof Error ? e.message.split("\n")[0] : "Something went wrong. Please try again.";
}

/** Error names worth refreshing the data for (the screen was out of date). */
export const STALE_ERRORS = /already claimed|expired|no longer valid|already staked|join window/i;
