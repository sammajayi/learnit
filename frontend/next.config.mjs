import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// One .env at the repo root is shared by frontend, backend and the Neon CLI.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production", console, true);


// Content Security Policy, in report-only mode first (see Privy's CSP guide): the browser logs what it WOULD block in the console
// and nothing breaks. After a click-through of login, verify, claim, stake and vote shows no violations, rename the header to
// "Content-Security-Policy" to enforce it. Next.js needs inline scripts for hydration, so script-src allows 'unsafe-inline'.
const dev = process.env.NODE_ENV !== "production";
const CELO_RPCS = "https://forno.celo.org https://rpc.ankr.com https://celo.drpc.org https://celo-json-rpc.stakely.io";
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
  "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com",
  `connect-src 'self' https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com ${CELO_RPCS}`,
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@learnit/backend"],
  // The leaderboard used to live at /league.
  async redirects() { return [{ source: "/league", destination: "/leaderboard", permanent: false }]; },
  experimental: { outputFileTracingRoot: root },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        // Enforced now: nobody may put the app in a frame (we are not embedded anywhere), and files are not content-sniffed.
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Report only: logs violations in the browser console without blocking anything.
        { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
      ],
    }];
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional x402 payment deps pulled in by unused wagmi connectors (Coinbase). We never use them.
    for (const m of ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client", "@farcaster/mini-app-solana", "@react-native-async-storage/async-storage"]) config.resolve.alias[m] = false;
    return config;
  },
};
export default nextConfig;
