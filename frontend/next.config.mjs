import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// One .env at the repo root is shared by frontend, backend and the Neon CLI.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production", console, true);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@learnit/backend"],
  // The leaderboard used to live at /league.
  async redirects() { return [{ source: "/league", destination: "/leaderboard", permanent: false }]; },
  experimental: { outputFileTracingRoot: root },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional x402 payment deps pulled in by unused wagmi connectors (Coinbase). We never use them.
    for (const m of ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client", "@farcaster/mini-app-solana", "@react-native-async-storage/async-storage"]) config.resolve.alias[m] = false;
    return config;
  },
};
export default nextConfig;
