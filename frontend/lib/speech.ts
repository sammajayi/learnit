"use client";

/**
 * Pronunciation. Every phrase in the lessons has a recording in /audio (made by backend/scripts/build-audio.py),
 * so it sounds the same on every device. The browser's own voices are only a fallback for a phrase with no
 * recording yet: they are missing on many devices (Brave hides them, many Linux and Android setups have no
 * Spanish or French voice), which is why they are not the main path.
 */

/** FNV-1a, 32 bit, over the UTF-8 bytes of "<lang>|<text>". Must match audio_id() in backend/scripts/build-audio.py. */
export function audioId(lang: string, text: string) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(`${lang}|${text.trim()}`)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}
export const audioUrl = (lang: string, text: string) => `/audio/${lang}/${audioId(lang, text)}.mp3`;

// One element for every phrase: iOS only lets a page play sound programmatically on an element it has
// already played from a tap, and reusing it also stops the previous phrase when a new one starts.
let player: HTMLAudioElement | null = null;
let playing = 0; // which call owns the player, so a late error from an old phrase cannot trigger a fallback

/** Plays the recording, or the browser voice if there is none. Returns false only when neither can play. */
export function speak(text: string, lang: string): boolean {
  if (typeof window === "undefined") return false;
  if (typeof Audio === "undefined") return speakWithVoice(text, lang);
  player ??= new Audio();
  const call = ++playing;
  let fellBack = false;
  const fallback = () => {
    if (fellBack || call !== playing) return;
    fellBack = true;
    speakWithVoice(text, lang);
  };
  if (canSpeak() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
  player.pause();
  player.onerror = fallback; // no recording for this phrase (404), or the file would not decode
  player.src = audioUrl(lang, text);
  player.play().catch((e: unknown) => {
    // Blocked because there was no tap yet (a lesson opened straight from a link): stay quiet, the speaker button works.
    if ((e as { name?: string })?.name === "NotAllowedError") return;
    if ((e as { name?: string })?.name === "AbortError") return; // replaced by the next phrase
    fallback();
  });
  return true;
}

/** Fetches the recordings ahead of time, so the first tap plays at once and the lesson still has sound offline. */
export function preloadSpeech(texts: string[], lang: string) {
  if (typeof window === "undefined") return;
  for (const t of new Set(texts.map((x) => x.trim()).filter(Boolean))) void fetch(audioUrl(lang, t)).catch(() => {});
}

// Browser voices, written around the usual ways they fail silently:
// - the voice list loads late (empty on first call), so we wait for `voiceschanged`;
// - Chrome drops an utterance queued right after cancel(), so we only cancel when something is playing;
// - Chrome can get stuck in a paused state, so we resume() first;
// - with no voice for the language the browser stays quiet, so we pick the closest voice ourselves.
let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function pickVoice(lang: string) {
  if (!voices.length) loadVoices();
  const l = lang.toLowerCase(), base = l.split("-")[0];
  const same = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(base));
  return same.find((v) => v.lang.toLowerCase().replace("_", "-") === l) ?? same.find((v) => v.localService) ?? same[0] ?? null;
}

/** The browser's built-in voices. Returns false when this browser has no speech support or no voice for the language. */
function speakWithVoice(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  const voice = pickVoice(lang);
  if (voices.length > 0 && !voice) return false; // voices are known, none for this language

  if (synth.speaking || synth.pending) synth.cancel();
  if (synth.paused) synth.resume();

  const play = (v: SpeechSynthesisVoice | null, retry: boolean) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = v?.lang ?? lang;
    if (v) u.voice = v;
    u.rate = 0.9;
    u.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") return; // we cancelled it ourselves
      console.warn("[speech] failed:", e.error, "voice:", v?.name ?? "default", "lang:", u.lang);
      // A specific voice can fail (network voices especially); retry once letting the browser choose.
      if (retry && v) play(null, false);
    };
    synth.speak(u);
  };
  // cancel() is async in some browsers; a short defer keeps the new utterance from being dropped with the old one.
  window.setTimeout(() => play(voice, true), synth.speaking ? 60 : 0);
  return true;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
