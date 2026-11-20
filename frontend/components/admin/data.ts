"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { erc20Abi } from "viem";
import { rewardsPoolAbi, streakVaultAbi } from "@learnit/backend/abis";
import { ADDR } from "@learnit/backend/chain";

export const DAY = 86_400;
/** After a challenge ends, the signer has this long to confirm the results. Past it, anyone may cancel the challenge. Same as the vault's RESULTS_DEADLINE. */
export const RESULTS_DEADLINE = 7 * DAY;
/** On-chain numbers reload this often while the tab is open. */
const POLL = 30_000;
export type Cohort = { id: number; start: number; end: number; min: bigint; max: bigint; pot: bigint; finishedStake: bigint; settled: boolean; voided: boolean; resultsFinal: boolean };
/** "finalize": ended, results not confirmed yet (the signer's job). "settle": results confirmed, waiting for anyone to call settle. */
export type CohortStatus = "upcoming" | "open" | "running" | "finalize" | "settle" | "settled" | "voided";

export function cohortStatus(c: Cohort, now: number): CohortStatus {
  if (c.voided) return "voided"; // results were never confirmed: cancelled, every staker takes their stake back
  if (c.settled) return "settled";
  if (now < c.start) return "upcoming";
  if (now < c.start + DAY) return "open";
  if (now < c.end) return "running";
  return c.resultsFinal ? "settle" : "finalize";
}

export function useCohorts() {
  const pc = usePublicClient();
  const vault = ADDR.streakVault;
  return useQuery({
    queryKey: ["admin", "cohorts"], enabled: !!vault && !!pc, staleTime: 15_000, refetchInterval: POLL,
    queryFn: async (): Promise<Cohort[]> => {
      const next = Number(await pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "nextCohortId" }));
      const ids = Array.from({ length: Math.max(0, next - 1) }, (_, i) => i + 1);
      if (!ids.length) return [];
      const res = await pc!.multicall({ allowFailure: false, contracts: ids.map((id) => ({ address: vault, abi: streakVaultAbi, functionName: "cohorts" as const, args: [BigInt(id)] as const })) });
      // A vault from before the settlement-review upgrade has no voided() or resultsFinal(); those calls fail and count as "no".
      const [voided, final] = await Promise.all((["voided", "resultsFinal"] as const).map((functionName) =>
        pc!.multicall({ allowFailure: true, contracts: ids.map((id) => ({ address: vault, abi: streakVaultAbi, functionName, args: [BigInt(id)] as const })) })));
      return res.map((r, i) => ({ id: ids[i], start: Number(r[0]), end: Number(r[1]), min: r[2], max: r[3], pot: r[4], finishedStake: r[5], settled: r[7], voided: voided[i].result === true, resultsFinal: final[i].result === true })).reverse();
    },
  });
}

/** Forfeit shares that settle() has set aside and distribute() has not sent on yet. null on a vault from before that upgrade. */
export function useVaultPending() {
  const pc = usePublicClient();
  const vault = ADDR.streakVault;
  return useQuery({
    queryKey: ["admin", "vault-pending"], enabled: !!vault && !!pc, staleTime: 15_000, refetchInterval: POLL,
    queryFn: async () => {
      try {
        const [rewards, ubi] = await Promise.all([
          pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "pendingRewards" }),
          pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "pendingUbi" }),
        ]);
        return { rewards, ubi };
      } catch { return null; }
    },
  });
}

export function useVaultPaused() {
  const pc = usePublicClient();
  const vault = ADDR.streakVault;
  return useQuery({ queryKey: ["admin", "vault-paused"], enabled: !!vault && !!pc, staleTime: 10_000, refetchInterval: POLL,
    queryFn: () => pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "paused" }) });
}

/** The length-based staking bonus: an admin-tunable bps rate per cohort length (7, 14 or 30 days),
 *  paid from a dedicated reserve funded separately from stakes. A cohort keeps the rate it was created with. */
export function useBonus() {
  const pc = usePublicClient();
  const vault = ADDR.streakVault;
  return useQuery({
    queryKey: ["admin", "bonus"], enabled: !!vault && !!pc, staleTime: 15_000, refetchInterval: POLL,
    queryFn: async () => {
      const [bps7, bps14, bps30, reserve, capBps] = await Promise.all([
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "bonusBpsFor", args: [7] }),
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "bonusBpsFor", args: [14] }),
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "bonusBpsFor", args: [30] }),
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "bonusReserve" }),
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "MAX_BONUS_BPS" }),
      ]);
      return { bpsFor: { 7: bps7, 14: bps14, 30: bps30 } as Record<7 | 14 | 30, number>, reserve, capBps };
    },
  });
}

export function usePool() {
  const pc = usePublicClient();
  const pool = ADDR.rewardsPool;
  return useQuery({
    queryKey: ["admin", "pool"], enabled: !!pool && !!pc, staleTime: 15_000, refetchInterval: POLL,
    queryFn: async () => {
      const day = BigInt(Math.floor(Date.now() / 1000 / DAY));
      const [balance, dailyCap, weeklyCap, dailyBudget, spentToday, paused, signer] = await Promise.all([
        pc!.readContract({ address: ADDR.gd, abi: erc20Abi, functionName: "balanceOf", args: [pool] }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "dailyCap" }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "weeklyCap" }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "dailyBudget" }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "spentOnDay", args: [day] }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "paused" }),
        pc!.readContract({ address: pool, abi: rewardsPoolAbi, functionName: "signer" }),
      ]);
      return { balance, dailyCap, weeklyCap, dailyBudget, spentToday, paused, signer };
    },
  });
}

/** G$ paid out per UTC day for the last `n` days, oldest first. One multicall. */
export function usePoolHistory(n = 14) {
  const pc = usePublicClient();
  const pool = ADDR.rewardsPool;
  return useQuery({
    queryKey: ["admin", "pool-history", n], enabled: !!pool && !!pc, staleTime: 60_000,
    queryFn: async () => {
      const today = Math.floor(Date.now() / 1000 / DAY);
      const days = Array.from({ length: n }, (_, i) => today - (n - 1 - i));
      const res = await pc!.multicall({ allowFailure: false, contracts: days.map((day) => ({ address: pool, abi: rewardsPoolAbi, functionName: "spentOnDay" as const, args: [BigInt(day)] as const })) });
      return days.map((day, i) => ({ day: new Date(day * DAY * 1000).toISOString().slice(0, 10), spent: res[i] as bigint }));
    },
  });
}

export type UbiDay = { day: string; claims: number; claimers: number; total: string };
export type ActivityDay = { day: string; signups: number; active: number; passed: number; /** Time in finished lessons that day, in seconds. Absent until the backend is redeployed. */ seconds?: number };
export type PublicStats = {
  generatedAt: string;
  users: { total: number; newLast7d: number; active1d: number; active7d: number; active30d: number; verified: number | null };
  learning: { attempts: number; passed: number; learnersWithPass: number; /** Time in finished lessons, in seconds (one attempt counts for at most 30 minutes). */ totalSeconds?: number; attemptingLearners?: number };
  activity?: ActivityDay[]; // newest first; absent until the backend is redeployed
  ubi: { allTime: Omit<UbiDay, "day">; today: Omit<UbiDay, "day">; days: UbiDay[] };
  /** All-time G$ moved through LearnIt, in wei. A part is null when it could not be read; absent until the backend is redeployed. */
  gUsed?: { ubi: string; rewards: string | null; staked: string | null; total: string | null };
};

/** Aggregate numbers anyone may read (no sign-in). Served from a five-minute cache. */
export function usePublicStats() {
  return useQuery({
    queryKey: ["admin", "public-stats"], staleTime: 60_000, refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/public/stats");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      return (await res.json()) as PublicStats;
    },
  });
}
