"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { celo } from "wagmi/chains";
import { erc20Abi } from "viem";
import { ADDR } from "@learnit/backend/chain";
import { useMe } from "./useMe";

/** The signed-in wallet's G$ and CELO, read from the chain. undefined while loading or if the read fails. */
export function useBalances() {
  const { data: me } = useMe();
  const client = usePublicClient({ chainId: celo.id });
  return useQuery({
    queryKey: ["balances", me?.wallet],
    enabled: !!me?.wallet && !!client,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const address = me!.wallet;
      const [gd, celoBal] = await Promise.all([
        ADDR.gd ? client!.readContract({ address: ADDR.gd, abi: erc20Abi, functionName: "balanceOf", args: [address] }).catch(() => undefined) : Promise.resolve(undefined),
        client!.getBalance({ address }).catch(() => undefined),
      ]);
      return { gd, celo: celoBal };
    },
  });
}
