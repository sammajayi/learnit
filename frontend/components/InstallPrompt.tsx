"use client";
import { Download, PlusSquare, Share, Smartphone, X } from "@/components/icons";
import { useInstall } from "@/lib/install";
import { Button, Card } from "./ui";

/** Offers to install the PWA. Chrome and Android get a one-tap Install; iPhone gets the two steps Safari needs. Hidden once installed. */
export function InstallPrompt() {
  const { state, install, dismiss, markInstalled } = useInstall();
  if (!state.show) return null;
  return (
    <Card aria-label="Install LearnIt" role="region" className="p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-input bg-sunken text-ink-2"><Smartphone size={18} strokeWidth={1.85} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Install LearnIt</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">Open it from your home screen like an app. Faster to start. On iPhone, it is also how daily reminders reach you.</p>
        </div>
        <button onClick={dismiss} aria-label="Not now" className="-mr-2 -mt-2 grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink"><X size={18} aria-hidden /></button>
      </div>
      {state.canPrompt && <Button onClick={() => void install()} icon={Download} variant="secondary" className="mt-5">Install app</Button>}
      {state.ios && (
        <>
          <ol className="mt-5 grid gap-3 text-sm text-ink-2">
            <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700"><Share size={15} aria-hidden /></span>Tap the Share button in Safari</li>
            <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-700"><PlusSquare size={15} aria-hidden /></span>Choose Add to Home Screen</li>
          </ol>
          <Button onClick={markInstalled} variant="outline" size="sm" className="mt-5">I have added it</Button>
        </>
      )}
    </Card>
  );
}
