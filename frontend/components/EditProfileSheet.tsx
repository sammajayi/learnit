"use client";
import { useCallback, useState } from "react";
import { Sheet } from "./ui/Sheet";
import { ProfileEditor } from "./ProfileEditor";

/**
 * Edit profile as a sheet (a modal on desktop). Closing with unsaved changes does not throw them away: the footer asks
 * whether to keep editing or discard. A save closes the sheet and tells the page, which says what changed.
 */
export function EditProfileSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finish = useCallback(() => { setLeaving(false); setDirty(false); onClose(); }, [onClose]);
  const request = useCallback(() => { if (dirty) setLeaving(true); else finish(); }, [dirty, finish]);

  return (
    <Sheet open={open} onClose={request} title="Edit profile">
      <ProfileEditor submitLabel="Save changes" leaving={leaving} onKeepEditing={() => setLeaving(false)} onDiscard={finish} onDirtyChange={setDirty}
        onDone={() => { finish(); onSaved?.(); }} />
    </Sheet>
  );
}
