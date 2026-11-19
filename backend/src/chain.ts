import { celo, celoAlfajores } from "viem/chains";

/** "mainnet" (default) or "testnet" (Celo Alfajores). Testnet has no safe defaults below:
 *  GoodDollar's dev Identity/token/UBI addresses differ per deployment and change over time, so
 *  they must be set explicitly (see GoodDollar's docs) rather than guessed here. */
const NETWORK = (process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet" : "mainnet") as "mainnet" | "testnet";
export const IS_TESTNET = NETWORK === "testnet";

export const CHAIN = IS_TESTNET ? celoAlfajores : celo;
export const CHAIN_ID = CHAIN.id;

/** citizen-sdk's IdentitySDK/ClaimSDK `env` option. Celo mainnet pairs with GoodDollar's
 *  "production" environment; override NEXT_PUBLIC_GOODDOLLAR_SDK_ENV if testing against a
 *  specific GoodDollar environment shows this default is wrong for your SDK version. */
export const GOODDOLLAR_SDK_ENV = process.env.NEXT_PUBLIC_GOODDOLLAR_SDK_ENV || (IS_TESTNET ? "staging" : "production");

const env = (v: string | undefined, fallback = "") => v ?? fallback;

export const ADDR = {
  gd: env(process.env.NEXT_PUBLIC_GOODDOLLAR_TOKEN_ADDRESS, IS_TESTNET ? "" : "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A") as `0x${string}`,
  identity: env(process.env.NEXT_PUBLIC_IDENTITY_ADDRESS, IS_TESTNET ? "" : "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42") as `0x${string}`,
  rewardsPool: env(process.env.NEXT_PUBLIC_REWARDS_POOL_ADDRESS) as `0x${string}`,
  streakVault: env(process.env.NEXT_PUBLIC_STREAK_VAULT_ADDRESS) as `0x${string}`,
  ubiScheme: env(process.env.NEXT_PUBLIC_UBI_SCHEME_ADDRESS, IS_TESTNET ? "" : "0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1") as `0x${string}`,
};
export const RPC_URL = env(process.env.NEXT_PUBLIC_CELO_RPC_URL, IS_TESTNET ? "https://alfajores-forno.celo-testnet.org" : "https://forno.celo.org");
/** Other public Celo endpoints to try, in order, when the main one stalls or errors. Mainnet only. The main RPC is still first. */
export const RPC_FALLBACK_URLS: string[] = IS_TESTNET ? [] : ["https://rpc.ankr.com/celo", "https://celo.drpc.org", "https://celo-json-rpc.stakely.io"];

export const identityAbi = [
  { type: "function", name: "isWhitelisted", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getWhitelistedRoot", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "lastAuthenticated", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "authenticationPeriod", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
