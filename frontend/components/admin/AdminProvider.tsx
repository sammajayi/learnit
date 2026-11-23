"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain } from "wagmi";
import { keccak256, toBytes, zeroHash } from "viem";
import { streakVaultAbi } from "@learnit/backend/abis";
import { ADDR, CHAIN, CHAIN_ID } from "@learnit/backend/chain";

const GUARDIAN = keccak256(toBytes("GUARDIAN_ROLE"));

type Ctx = {
  address?: `0x${string}`;
  connect: () => void;
  connecting: boolean;
  disconnect: () => void;
  hasInjected: boolean;
  /** What the connected wallet may do on the StreakVault. The contract is the only authority. */
  roles: { admin: boolean; guardian: boolean } | undefined;
  rolesLoading: boolean;
  /** True when the connected wallet is on a different network from the app's. Sending anything would fail or hit the wrong chain. */
  wrongNetwork: boolean;
  networkName: string;
  switchNetwork: () => void;
  switching: boolean;
};

const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin outside AdminProvider");
  return c;
};

/** The dashboard is public. This only tracks an optional wallet, to unlock actions for the admin and guardian roles. */
export function AdminProvider({ children }: { children: ReactNode }) {
  const pc = usePublicClient();
  const { address, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const vault = ADDR.streakVault;

  const roles = useQuery({
    queryKey: ["admin", "roles", address], enabled: !!vault && !!pc && !!address, staleTime: 30_000,
    queryFn: async () => {
      const [admin, guardian] = await Promise.all([
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "hasRole", args: [zeroHash, address!] }),
        pc!.readContract({ address: vault, abi: streakVaultAbi, functionName: "hasRole", args: [GUARDIAN, address!] }),
      ]);
      return { admin, guardian };
    },
  });

  const value = useMemo<Ctx>(() => ({
    address,
    connect: () => { const c = connectors[0]; if (c) connect({ connector: c }); },
    connecting, disconnect: () => disconnect(), hasInjected: connectors.length > 0,
    roles: roles.data, rolesLoading: roles.isLoading,
    wrongNetwork: !!address && chainId !== undefined && chainId !== CHAIN_ID, networkName: CHAIN.name,
    switchNetwork: () => switchChain({ chainId: CHAIN_ID as never }), switching,
  }), [address, chainId, switchChain, switching, connectors, connect, connecting, disconnect, roles.data, roles.isLoading]);

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}
