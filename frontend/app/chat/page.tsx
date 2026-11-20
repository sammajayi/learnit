"use client";
import { useState } from "react";
import { Keyboard, Mic, SendHorizontal, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, PageHeader, fieldClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CHAT_ENABLED, type ChatMessage, type ChatMode } from "@/lib/chat";
import { useAuthGate } from "@/components/useAuthGate";
import { useMe } from "@/lib/useMe";
import { langOf } from "@/lib/languages";

// An example shown while chat is not live, so people can see how corrections will look. Not a real conversation.
const EXAMPLE: Record<"fr" | "es", ChatMessage[]> = {
  fr: [
    { id: "a1", role: "assistant", text: "Bonjour ! Comment s'est passée ta journée ?" },
    { id: "u1", role: "user", text: "Je suis allé au marché et j'ai acheté des pommes rouge.", correction: { wrong: "rouge", right: "rouges", why: "An adjective agrees with its noun. Pommes is plural, so the adjective takes an s." } },
    { id: "a2", role: "assistant", text: "Super ! Et qu'est-ce que tu as fait avec les pommes rouges ?" },
  ],
  es: [
    { id: "a1", role: "assistant", text: "¡Hola! ¿Cómo estuvo tu día?" },
    { id: "u1", role: "user", text: "Yo soy cansado hoy.", correction: { wrong: "soy cansado", right: "estoy cansado", why: "Use estar for how you feel right now. Ser is for things that stay the same." } },
    { id: "a2", role: "assistant", text: "Descansa un poco. ¿Qué hiciste hoy?" },
  ],
};

export default function Chat() {
  const ok = useAuthGate();
  const [mode, setMode] = useState<ChatMode>("type");
  const { data: me } = useMe();
  const lang = langOf(me?.course ?? "fr");
  const messages = EXAMPLE[lang.code];
  if (!ok) return null;

  return (
    <AppShell width="narrow">
      <PageHeader
        eyebrow={lang.english}
        title="Chat"
        description="Practise with an AI partner in the language you are learning. It will correct your mistakes and tell you why."
        action={<Badge tone="coral" icon={Sparkles} className="px-3 py-1 text-sm">Coming soon</Badge>}
      />


      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage-100 text-sage-700"><Sparkles size={16} aria-hidden /></span>
            <div>
              <p className="text-[15px] font-semibold text-ink">Your future {lang.english} partner</p>
              <p className="text-xs text-muted">Example conversation, not live</p>
            </div>
          </div>
        </div>

        <ol className="grid gap-5 px-5 py-6" aria-label="Example conversation">
          {messages.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
              <p lang={lang.code} className={cn("max-w-[85%] rounded-card px-4 py-3 text-[15px] leading-relaxed",
                m.role === "user" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-line bg-surface text-ink")}>{m.text}</p>
              {m.correction && (
                <div className="max-w-[85%] rounded-input bg-sage-50 px-4 py-3 text-sm ring-1 ring-inset ring-sage-100">
                  <p className="font-medium text-ink">
                    <span lang={lang.code} className="text-muted line-through">{m.correction.wrong}</span>
                    <span aria-hidden className="mx-2 text-muted">to</span><span className="sr-only"> corrected to </span>
                    <span lang={lang.code} className="font-semibold text-sage-700">{m.correction.right}</span>
                  </p>
                  <p className="mt-1 text-pretty leading-relaxed text-ink-2">{m.correction.why}</p>
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="border-t border-line bg-canvas/50 p-3">
          {/* One way at a time: type or speak. */}
          <div role="group" aria-label="How do you want to chat?" className="mb-3 inline-flex rounded-btn bg-sunken p-1 ring-1 ring-inset ring-line">
            {([["type", "Type", Keyboard], ["voice", "Voice", Mic]] as const).map(([m, label, Icon]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                className={cn("inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-medium transition duration-200",
                  mode === m ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink")}>
                <Icon size={16} strokeWidth={2} aria-hidden />{label}
              </button>
            ))}
          </div>

          {mode === "type" ? (
            <form className="flex items-center gap-2" onSubmit={(e) => e.preventDefault()} aria-describedby="chat-soon">
              <label htmlFor="chat-input" className="sr-only">Your message</label>
              <input id="chat-input" disabled={!CHAT_ENABLED} placeholder={CHAT_ENABLED ? `Write in ${lang.english}` : "Chat opens soon"} autoComplete="off" className={cn(fieldClass, "h-12 flex-1")} />
              <Button type="submit" disabled={!CHAT_ENABLED} aria-label="Send message" icon={SendHorizontal} className="h-12 w-12 shrink-0 px-0" />
            </form>
          ) : (
            <div className="grid justify-items-center gap-2 py-2 text-center" aria-describedby="chat-soon">
              <button type="button" disabled={!CHAT_ENABLED} aria-label="Start speaking"
                className="grid h-16 w-16 place-items-center rounded-full bg-coral-600 text-white shadow-card transition hover:bg-coral-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-2/70 disabled:shadow-none">
                <Mic size={26} strokeWidth={2} aria-hidden />
              </button>
              <p className="text-sm font-medium text-ink">{CHAT_ENABLED ? "Tap and speak" : "Voice opens soon"}</p>
              <p className="max-w-[40ch] text-pretty text-xs leading-relaxed text-muted">When it is live, you will speak, your partner will answer out loud, and any corrections will appear here so you can read them.</p>
            </div>
          )}
          <p id="chat-soon" className="sr-only">Chat is not available yet.</p>
        </div>
      </Card>
    </AppShell>
  );
}
