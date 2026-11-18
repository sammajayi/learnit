"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Loader2, Trash2 } from "lucide-react";
import { validateUsername, BIO_MAX, NAME_MAX } from "@learnit/backend/profile";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";
import { toAvatarBlob } from "@/lib/resizeImage";
import { Avatar } from "./Avatar";
import { Button, Label, Notice, fieldClass } from "./ui";
import { cn } from "@/lib/cn";

type Check = { state: "idle" | "checking" | "ok" | "bad"; reason?: string };

/** Photo, username, display name and bio. Used on the profile page and in onboarding. */
export function ProfileEditor({ submitLabel = "Save", onDone, allowSkipSave = false }: { submitLabel?: string; onDone?: () => void; allowSkipSave?: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const { data: me } = useMe();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);
  const file = useRef<HTMLInputElement>(null);

  // Fill the form once, when the profile first arrives.
  useEffect(() => {
    if (!me || loaded.current) return;
    loaded.current = true;
    setUsername(me.username ?? ""); setDisplayName(me.displayName ?? ""); setBio(me.bio ?? "");
  }, [me]);

  // Live username check: format first (instant), then availability (debounced).
  useEffect(() => {
    const u = username.trim();
    if (!u || u.toLowerCase() === (me?.username ?? "")) return setCheck({ state: "idle" });
    const local = validateUsername(u);
    if (!local.ok) return setCheck({ state: "bad", reason: local.reason });
    setCheck({ state: "checking" });
    let dead = false;
    const t = setTimeout(() => {
      api<{ available: boolean; reason?: string }>(`/api/profile/username?u=${encodeURIComponent(local.value)}`)
        .then((r) => { if (!dead) setCheck(r.available ? { state: "ok" } : { state: "bad", reason: r.reason }); })
        .catch(() => { if (!dead) setCheck({ state: "idle" }); });
    }, 450);
    return () => { dead = true; clearTimeout(t); };
  }, [username, me?.username, api]);

  const dirty = !!me && (username.trim().toLowerCase() !== (me.username ?? "") || displayName.trim() !== (me.displayName ?? "") || bio.trim() !== (me.bio ?? ""));
  const blocked = check.state === "bad" || check.state === "checking";

  async function pickPhoto(f: File | undefined) {
    if (!f) return;
    setPhotoBusy(true); setErr(null);
    try {
      const blob = await toAvatarBlob(f);
      await api("/api/profile/avatar", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not upload that photo. Try again, or pick a different one."); }
    finally { setPhotoBusy(false); if (file.current) file.current.value = ""; }
  }

  async function removePhoto() {
    setPhotoBusy(true); setErr(null);
    try { await api("/api/profile/avatar", { method: "DELETE" }); await qc.invalidateQueries({ queryKey: ["me"] }); }
    catch (e) { setErr(e instanceof Error ? e.message : "We could not remove your photo. Try again in a moment."); }
    finally { setPhotoBusy(false); }
  }

  async function save() {
    if (!dirty) return onDone?.();
    setSaving(true); setErr(null); setSaved(false);
    try {
      await api("/api/profile", { method: "PUT", body: JSON.stringify({ username, displayName, bio }) });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      onDone?.();
    } catch (e) { setErr(e instanceof Error ? e.message : "We could not save your profile. Try again in a moment."); }
    finally { setSaving(false); }
  }

  const shownName = displayName.trim() || (username ? `@${username}` : "You");
  return (
    <div>
      <div className="flex items-center gap-5">
        <button type="button" onClick={() => file.current?.click()} disabled={photoBusy} aria-label="Change profile photo" className="group relative shrink-0 rounded-full transition active:scale-[0.97]">
          <Avatar src={me?.avatarUrl} name={shownName} size={80} />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/0 text-white opacity-0 transition group-hover:bg-ink/40 group-hover:opacity-100"><Camera size={20} aria-hidden /></span>
          {photoBusy && <span className="absolute inset-0 grid place-items-center rounded-full bg-ink/50 text-white"><Loader2 size={20} className="animate-spin" aria-hidden /></span>}
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" tabIndex={-1} onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        <div>
          <p className="text-sm font-semibold text-ink">Profile photo</p>
          <p className="mt-0.5 text-xs text-muted">JPG, PNG or WebP. We resize it for you.</p>
          <div className="mt-2.5 flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" icon={Camera} onClick={() => file.current?.click()} disabled={photoBusy}>{me?.avatarUrl ? "Change" : "Upload"}</Button>
            {me?.avatarUrl && <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={removePhoto} disabled={photoBusy}>Remove</Button>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5">
        <div>
          <Label htmlFor="username">Username</Label>
          <div className="relative mt-2">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} autoComplete="off"
              aria-describedby="username-help" aria-invalid={check.state === "bad"} className={cn(fieldClass, "pl-9")} placeholder="yourname" />
            {check.state === "checking" && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-hidden />}
            {check.state === "ok" && <Check size={16} strokeWidth={2.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-600" aria-hidden />}
          </div>
          <p id="username-help" className="mt-1.5 min-h-5 text-[13px]" aria-live="polite">
            {check.state === "checking" && <span className="text-muted">Checking availability…</span>}
            {check.state === "ok" && <span className="font-medium text-sage-700">Available</span>}
            {check.state === "bad" && <span className="font-medium text-danger">{check.reason}</span>}
            {check.state === "idle" && <span className="text-muted">3 to 20 letters, numbers or underscores.</span>}
          </p>
        </div>
        <div>
          <Label htmlFor="display">Display name</Label>
          <input id="display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={NAME_MAX} autoComplete="name" className={cn(fieldClass, "mt-2")} placeholder="How you appear to others" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="bio">About you</Label>
            <span className="tabular text-xs text-muted">{bio.length}/{BIO_MAX}</span>
          </div>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} rows={3} className={cn(fieldClass, "mt-2 resize-none")} placeholder="Why are you learning?" />
        </div>
      </div>

      {err && <Notice tone="danger" className="mt-5">{err}</Notice>}
      <Button type="button" onClick={save} loading={saving} disabled={!me || blocked || (!dirty && !allowSkipSave)} size="lg" block className="mt-6"
        icon={saved && !dirty ? Check : undefined} variant={saved && !dirty ? "subtle" : "primary"}>
        {saved && !dirty ? "Saved" : submitLabel}
      </Button>
    </div>
  );
}
