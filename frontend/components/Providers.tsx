"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { WagmiProvider as PlainWagmiProvider, createConfig as createPlainConfig, injected } from "wagmi";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { fallback, http } from "viem";
import { useEffect, useRef, useState } from "react";
import { CHAIN, RPC_URL, RPC_FALLBACK_URLS } from "@learnit/backend/chain";
import { startInstallListener } from "@/lib/install";
import { useAuth } from "@/lib/useAuth";
import { ReferralCapture } from "./ReferralCapture";

// CHAIN is one of two chains picked at runtime by env var, so its static type is a union; wagmi's
// transports map type demands both branches' ids unless we tell it which one actually applies here.
// The browser reads the chain too (balances, allowance). Same idea as the server: try the next endpoint when one stalls.
const rpcTransport = () => fallback([RPC_URL, ...RPC_FALLBACK_URLS.filter((u) => u !== RPC_URL)].map((u) => http(u, { timeout: 6_000, retryCount: 1 })));
const wagmiConfig = createConfig({ chains: [CHAIN], transports: { [CHAIN.id]: rpcTransport() } as never });

// /admin uses a plain browser wallet (no Privy, no login, no onboarding), so it gets its own wagmi config.
const adminConfig = createPlainConfig({ chains: [CHAIN], connectors: [injected()], transports: { [CHAIN.id]: http(RPC_URL) } as never });

/** Cached data belongs to whoever was signed in. When the account changes (sign out, sign in as someone else), start again
 *  so the new account never sees the last one's challenges, stake or profile while the fresh data loads. */
function CacheGuard() {
  const qc = useQueryClient();
  const { ready, userId } = useAuth();
  const last = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!ready) return;
    if (last.current !== undefined && last.current !== userId) void qc.resetQueries();
    last.current = userId;
  }, [ready, userId, qc]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false, retry: 1 } } }));
  useEffect(() => {
    startInstallListener(); // catch the browser's install offer before any screen asks for it
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const path = usePathname();
  if (path === "/admin" || path.startsWith("/admin/")) {
    return (
      <QueryClientProvider client={qc}>
        <PlainWagmiProvider config={adminConfig}>{children}</PlainWagmiProvider>
      </QueryClientProvider>
    );
  }
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <p className="p-6 text-sm text-ink-2">Set NEXT_PUBLIC_PRIVY_APP_ID in .env to start.</p>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: { theme: "light", accentColor: "#0F172A", landingHeader: "Welcome to LearnIt", walletList: ["detected_wallets", "wallet_connect"] },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: CHAIN,
        supportedChains: [CHAIN],
        externalWallets: {},
        // Without this, WalletConnect falls back to Privy's shared default project, which is rate-limited
        // and shows exactly as "wallet says Connecting... and never gets to the sign prompt" under load.
        ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? { walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID } : {}),
      }}
    >
      <QueryClientProvider client={qc}>
        <CacheGuard />
        <ReferralCapture />
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
