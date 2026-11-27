"use client";
import dynamic from "next/dynamic";

/** The sign-in and wallet libraries only run in the browser, so they are left out of the server bundle. */
const Providers = dynamic(() => import("./Providers").then((m) => m.Providers), { ssr: false });
export const ClientProviders = ({ children }: { children: React.ReactNode }) => <Providers>{children}</Providers>;
