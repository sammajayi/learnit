"use client";
import { useQuery } from "@tanstack/react-query";
import { ADDR } from "@learnit/backend/chain";

type Remote = { rewardsPool: `0x${string}` | null; streakVault: `0x${string}` | null };

/** Where rewards are claimed and stakes are made, as the server sees it. This build's own values are used only
 *  until the server answers, or if it cannot be reached, so a network blip never switches a live feature off.
 *  `ready` is true once we know the answer, so screens can wait before saying something is not live. */
export function useContracts() {
  const { data, isFetched } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const r = await fetch("/api/config");
      if (!r.ok) throw new Error("config");
      return (await r.json()) as Remote;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    rewardsPool: (data ? data.rewardsPool ?? "" : ADDR.rewardsPool) as `0x${string}`,
    streakVault: (data ? data.streakVault ?? "" : ADDR.streakVault) as `0x${string}`,
    ready: isFetched,
  };
}
