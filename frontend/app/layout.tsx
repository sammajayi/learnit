import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-600.css";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClientProviders as Providers } from "@/components/ClientProviders";

export const dynamic = "force-dynamic"; // Privy needs a real app id at runtime, not at build

export const metadata: Metadata = {
  title: "LearnIt",
  description: "Learn French or Spanish in ten minutes a day, and earn GoodDollar (G$) as you go.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "LearnIt", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#f8f6f1", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
