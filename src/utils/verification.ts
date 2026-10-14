// Sends the "verify your email" message. Prefers KalingaCare's branded
// email (the web app's /api/send-verification-email, with a button); if that
// service is unavailable, falls back to Firebase's built-in plain email so
// verification never breaks. The link opens the website's Email verified
// page, then the customer returns to the app.

import { sendEmailVerification, type User } from 'firebase/auth';

const API_URL = 'https://kalingacare-drab.vercel.app/api/send-verification-email';
const RETURN_URL = 'https://kalingacare-drab.vercel.app/email-verified.html';

export class TooSoonError extends Error {}

export async function sendVerificationEmail(user: User): Promise<void> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new TooSoonError(data.error || 'Please wait a minute before asking for another link.');
    }
    if (res.ok) return;
    console.warn("Branded verification email failed, using Firebase's:", res.status);
  } catch (err) {
    if (err instanceof TooSoonError) throw err;
    console.warn("Branded verification email unavailable, using Firebase's:", err);
  }
  await sendEmailVerification(user, { url: RETURN_URL });
}
