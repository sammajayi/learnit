import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppSignIn } from "@/components/AppSignIn";
import { LoginScreen } from "@/components/LoginScreen";
import { RedirectIfSignedIn } from "@/components/RedirectIfSignedIn";

const description = "Ten calm minutes a day of French or Spanish, from zero. Pass a lesson, keep your streak, and earn GoodDollar (G$) rewards on Celo.";
export const metadata: Metadata = {
  title: "LearnIt: learn French or Spanish, earn G$",
  description,
  openGraph: { title: "LearnIt: learn French or Spanish, earn G$", description, type: "website", siteName: "LearnIt" },
  twitter: { card: "summary", title: "LearnIt: learn French or Spanish, earn G$", description },
};

/** The public landing page. The app itself lives at /home. */
export default async function Landing() {
  // On the app subdomain, / is a plain sign-in screen; the marketing page is for the apex domain.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const onApp = !!appUrl && (h.get("x-forwarded-host") ?? h.get("host")) === new URL(appUrl).host;
  return (
    <>
      <RedirectIfSignedIn />
      {onApp ? <AppSignIn /> : <LoginScreen />}
    </>
  );
}
