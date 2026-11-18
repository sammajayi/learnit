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
