import { Resend } from "resend";

let _resend: Resend | null = null;
/** Returns false when RESEND_API_KEY is not set, so callers can answer "not available" instead of crashing. */
export function configureEmail(): boolean {
  if (_resend) return true;
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  _resend = new Resend(key);
  return true;
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!_resend) throw new Error("Email is not configured");
  const from = process.env.RESEND_FROM_EMAIL || "LearnIt <notifications@uselearnit.xyz>";
  const { error } = await _resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(error.message);
}

/**
 * Every address Resend has already sent an email with this exact subject to, so a mass send can be run again without emailing the
 * same person twice. Reads Resend's own sent log (100 per page, paced under its two-requests-a-second limit).
 */
export async function recipientsAlreadySent(subject: string): Promise<Set<string>> {
  if (!_resend) throw new Error("Email is not configured");
  const out = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 200; page++) {
    const { data, error } = await _resend.emails.list({ limit: 100, ...(after ? { after } : {}) });
    if (error) throw new Error(error.message);
    for (const e of data?.data ?? []) {
      if (e.subject !== subject) continue;
      for (const to of Array.isArray(e.to) ? e.to : [e.to]) if (to) out.add(String(to).trim().toLowerCase());
    }
    if (!data?.has_more || !data.data.length) break;
    after = data.data[data.data.length - 1].id;
    await new Promise((r) => setTimeout(r, 600));
  }
  return out;
}
